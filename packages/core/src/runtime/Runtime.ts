import { Discovery } from "../discovery/Discovery";
import { FieldErrorRenderer } from "../errors/FieldErrorRenderer";
import { FieldNode } from "../field/FieldNode";
import { FieldRegistry } from "../field/FieldRegistry";
import { FieldState } from "../field/FieldState";
import {
  isRuntimeMutationRelevant,
  runtimeMutationObserverOptions,
} from "./RuntimeMutationPolicy";
import { Serializer } from "../serialization/Serializer";
import {
  createValidationPipeline,
  ValidationFieldMeta,
  ValidationPipeline,
} from "../validation/ValidationPipeline";
import {
  NativeFormFlatValues,
  NativeFormElement,
  NativeFormValue,
  NativeFormValues,
  RuntimeEvent,
  RuntimeListener,
} from "../shared/types";
import {
  SchemaLike,
  ValidationIssue,
  ValidationResult,
  Validator,
} from "../validation/Validation";

export interface RuntimeOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  schema?: SchemaLike<TValues>;
  validator?: Validator<TValues>;
  pipeline?: ValidationPipeline<TValues>;
  onSubmit?: (values: TValues, event?: SubmitEvent) => void | Promise<void>;
  onInvalid?: (
    errors: Record<string, string>,
    values: NativeFormValues,
    event?: SubmitEvent,
  ) => void;
}

export interface RuntimeFormState {
  dirty: boolean;
  touched: boolean;
  valid: boolean;
  submitting: boolean;
  validating: boolean;
  errors: Record<string, string>;
  fields: FieldState[];
  values: NativeFormFlatValues;
}

export interface RuntimePublicApi<
  TValues extends NativeFormValues = NativeFormValues,
> {
  readonly fields: FieldState[];
  mount(form: HTMLFormElement): void;
  unmount(): void;
  serialize(): NativeFormFlatValues;
  validate(): Promise<ValidationResult<TValues>>;
  submit(event?: SubmitEvent): Promise<ValidationResult<TValues>>;
  subscribe(listener: RuntimeListener): () => void;
  unsubscribe(listener: RuntimeListener): void;
  getFieldState(name: string): FieldState | undefined;
  getFieldStates(): FieldState[];
  getFormState(): RuntimeFormState;
}

type FieldRuntimeEvent = Extract<RuntimeEvent, { type: `field:${string}` }>;
type ValidationRuntimeEvent = Extract<
  RuntimeEvent,
  { type: `validation:${string}` }
>;
type FormRuntimeEvent = Extract<RuntimeEvent, { type: `form:${string}` }>;

export class Runtime<
  TValues extends NativeFormValues = NativeFormValues,
> implements RuntimePublicApi<TValues> {
  private readonly registry = new FieldRegistry();

  private readonly discovery = new Discovery();

  private readonly serializer = new Serializer();

  private readonly fieldErrorRenderer = new FieldErrorRenderer();

  private form?: HTMLFormElement;

  private readonly listeners = new Set<RuntimeListener>();

  // Field state is now managed on each FieldNode instance.

  private observer?: MutationObserver;

  private validationController?: AbortController;

  private submitting = false;

  private validating = false;

  private errors: Record<string, string> = {};

  private readonly pipeline: ValidationPipeline<TValues>;

  constructor(private readonly options: RuntimeOptions<TValues> = {}) {
    this.pipeline =
      options.pipeline ??
      createValidationPipeline({
        schema: options.schema,
        validator: options.validator,
      });

    // Subscribe to registry lifecycle changes so Runtime can emit events.
    this.registry.onChange = (e) => {
      if (e.type === "mount") {
        this.emitFieldEvent({ type: "field:mount", field: e.field.name });
      } else {
        this.emitFieldEvent({ type: "field:unmount", field: e.field.name });
      }
    };
  }

  mount(form: HTMLFormElement) {
    this.form = form;
    this.syncFields();
    this.fieldErrorRenderer.normalizeFields(this.registry.values());

    const values = this.serialize();

    for (const field of this.registry.getAll()) {
      field.register(values[field.name]);
    }

    form.addEventListener("submit", this.handleSubmit);
    form.addEventListener("input", this.handleFieldUpdate);
    form.addEventListener("change", this.handleFieldUpdate);
    form.addEventListener("blur", this.handleFieldBlur, true);
    form.addEventListener("reset", this.handleReset);
    this.observer = new MutationObserver(this.handleMutation);
    this.observer.observe(form, runtimeMutationObserverOptions);
    this.emitFormEvent({
      type: "form:mount",
    });
  }

  unmount() {
    if (this.form) {
      this.form.removeEventListener("submit", this.handleSubmit);
      this.form.removeEventListener("input", this.handleFieldUpdate);
      this.form.removeEventListener("change", this.handleFieldUpdate);
      this.form.removeEventListener("blur", this.handleFieldBlur, true);
      this.form.removeEventListener("reset", this.handleReset);
    }

    this.observer?.disconnect();
    this.observer = undefined;
    this.validationController?.abort();
    this.validationController = undefined;
    this.fieldErrorRenderer.applyErrors(this.registry.values(), {});
    this.registry.clear();

    this.form = undefined;
    this.errors = {};
    this.submitting = false;
    this.validating = false;

    this.emitFormEvent({
      type: "form:unmount",
    });

    this.listeners.clear();
  }

  serialize() {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    return this.serializer.serialize(this.form);
  }

  get fields(): FieldState[] {
    return this.getFieldStates();
  }

  subscribe(listener: RuntimeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.unsubscribe(listener);
    };
  }

  unsubscribe(listener: RuntimeListener): void {
    this.listeners.delete(listener);
  }

  private notify(event: RuntimeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private emitFieldEvent(event: FieldRuntimeEvent): void {
    this.notify(event);
  }

  private emitValidationEvent(event: ValidationRuntimeEvent): void {
    this.notify(event);
  }

  private emitFormEvent(event: FormRuntimeEvent): void {
    this.notify(event);
  }

  submit(event?: SubmitEvent) {
    return this.processSubmitFlow(event);
  }

  validate() {
    return this.runValidation(this.serialize());
  }

  private handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void this.processSubmitFlow(event);
  };

  private async processSubmitFlow(
    event?: SubmitEvent,
  ): Promise<ValidationResult<TValues>> {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    const values = this.serialize();
    // lifecycle: mark fields as submitted/touched
    for (const field of this.registry.values()) {
      field.handleSubmit();
      this.emitFieldEvent({
        type: "field:submit",
        field: field.name,
      });
    }

    const validation = await this.runValidation(values);

    if (!validation.success) {
      this.options.onInvalid?.(this.errors, values, event);
      this.emitFormEvent({
        type: "form:invalid",
        errors: this.errors,
        values,
      });

      return validation;
    }

    this.submitting = true;

    this.emitFormEvent({
      type: "form:submit",
      values: validation.values,
    });

    try {
      await this.options.onSubmit?.(validation.values, event);
    } finally {
      this.submitting = false;
    }

    return validation;
  }

  private async runValidation(
    values: NativeFormFlatValues,
  ): Promise<ValidationResult<TValues>> {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    this.validationController?.abort();
    const controller = new AbortController();
    this.validationController = controller;
    this.validating = true;

    this.emitValidationEvent({
      type: "validation:start",
      values,
    });

    this.errors = {};
    for (const field of this.registry.values()) {
      field.setError(this.errors[field.name]);
    }
    this.applyNativeErrors();

    const result = await this.pipeline.validate(values, {
      form: this.form,
      signal: controller.signal,
      fields: this.getValidationFields(),
    });

    if (!controller.signal.aborted) {
      this.applyValidationResult(result, values);

      if (this.validationController === controller) {
        this.validating = false;
      }
    }

    return result;
  }
  private handleFieldUpdate = (event: Event) => {
    const element = toNativeFormElement(event.target);

    if (!element?.name || !this.form) return;

    if (event.type === "input") {
      this.processInputFlow(element);
      return;
    }

    if (event.type === "change") {
      this.processChangeFlow(element);
      return;
    }

    this.processUpdateFlow(element);
  };

  private processInputFlow(element: NativeFormElement): void {
    const snapshot = this.prepareFieldFlow(element);

    if (!snapshot) {
      return;
    }

    const { node, values, value } = snapshot;
    node.handleInput(value);

    void this.runFieldValidation(node, values).then(() => {
      this.options.onInvalid?.(this.errors, values);
    });

    this.emitFieldEvent({
      type: "field:input",
      field: element.name,
      value,
      values,
    });

    // Normalized generic update signal for any value change source.
    this.emitFieldEvent({
      type: "field:update",
      field: element.name,
      value,
      values,
    });
  }

  private processChangeFlow(element: NativeFormElement): void {
    const snapshot = this.prepareFieldFlow(element);

    if (!snapshot) {
      return;
    }

    const { node, values, value } = snapshot;
    node.handleChange(value);

    void this.runFieldValidation(node, values).then(() => {
      this.options.onInvalid?.(this.errors, values);
    });

    this.emitFieldEvent({
      type: "field:change",
      field: element.name,
      value,
      values,
    });

    // Normalized generic update signal for any value change source.
    this.emitFieldEvent({
      type: "field:update",
      field: element.name,
      value,
      values,
    });
  }

  private processUpdateFlow(element: NativeFormElement): void {
    const snapshot = this.prepareFieldFlow(element);

    if (!snapshot) {
      return;
    }

    const { node, values, value } = snapshot;
    node.updateValue(value);

    void this.runFieldValidation(node, values).then(() => {
      this.options.onInvalid?.(this.errors, values);
    });

    this.emitFieldEvent({
      type: "field:update",
      field: element.name,
      value,
      values,
    });
  }

  private prepareFieldFlow(element: NativeFormElement):
    | {
        node: FieldNode;
        values: NativeFormFlatValues;
        value: NativeFormValue | undefined;
      }
    | undefined {
    this.ensureField(element);

    const values = this.serialize();
    const value = values[element.name];
    const node = this.registry.get(element.name);

    if (!node) {
      return undefined;
    }

    return { node, values, value };
  }

  private handleFieldBlur = (event: Event) => {
    const element = toNativeFormElement(event.target);

    if (!element?.name || !this.form) return;

    this.ensureField(element);

    const values = this.serialize();
    const value = values[element.name];

    const node = this.registry.get(element.name);
    node?.handleBlur();

    this.emitFieldEvent({
      type: "field:blur",
      field: element.name,
      value,
      values,
    });
  };

  private async runFieldValidation(
    field: FieldNode,
    values: NativeFormFlatValues,
  ): Promise<ValidationResult<TValues>> {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    this.validationController?.abort();
    const controller = new AbortController();
    this.validationController = controller;
    this.validating = true;

    this.emitValidationEvent({
      type: "validation:start",
      values,
    });

    this.errors = {};
    for (const f of this.registry.values()) {
      f.setError(this.errors[f.name]);
    }
    this.applyNativeErrors();

    const context = {
      form: this.form,
      signal: controller.signal,
      fields: this.getValidationFields(),
    };
    const activeFieldMeta = this.toValidationField(field);
    const supportsFieldScopedValidation =
      this.pipeline.capabilities?.supportsFieldScopedValidation ?? true;

    const result = supportsFieldScopedValidation
      ? await this.pipeline.validateField(activeFieldMeta, values, context)
      : await this.pipeline.validate(values, context);

    if (!controller.signal.aborted) {
      this.applyValidationResult(result, values);

      if (this.validationController === controller) {
        this.validating = false;
      }
    }

    return result;
  }

  private handleReset = () => {
    queueMicrotask(() => {
      if (!this.form) return;

      const values = this.serialize();

      this.processResetFlow(values);
    });
  };

  private processResetFlow(values: NativeFormFlatValues): void {
    for (const field of this.registry.values()) {
      field.handleReset(values[field.name]);
      this.emitFieldEvent({
        type: "field:reset",
        field: field.name,
        value: values[field.name],
        values,
      });
    }
    this.errors = {};
    this.applyNativeErrors();

    this.emitFormEvent({
      type: "form:reset",
      values,
    });
  }

  getFieldState(name: string) {
    return this.registry.get(name)?.getState();
  }

  getFieldStates() {
    return this.registry.values().map((f) => f.getState());
  }

  getFormState(): RuntimeFormState {
    const fields = this.getFieldStates();

    return {
      dirty: fields.some((field) => field.dirty),
      touched: fields.some((field) => field.touched),
      valid: Object.keys(this.errors).length === 0,
      submitting: this.submitting,
      validating: this.validating,
      errors: { ...this.errors },
      fields,
      values: this.form ? this.serialize() : ({} as NativeFormFlatValues),
    };
  }

  private ensureField(element: NativeFormElement): void {
    if (this.registry.has(element.name)) {
      return;
    }

    this.registry.register(new FieldNode(element));
    const node = this.registry.get(element.name)!;
    node.register(this.getFieldValue(element.name));
  }

  private getFieldValue(name: string): NativeFormValue | undefined {
    if (!this.form) {
      return undefined;
    }

    return this.serializer.serialize(this.form)[name];
  }

  private getValidationFields(): ValidationFieldMeta[] {
    return this.registry.values().map((field) => this.toValidationField(field));
  }

  private toValidationField(field: FieldNode): ValidationFieldMeta {
    return {
      name: field.name,
      validationMessage: field.element.validationMessage,
    };
  }

  private syncFields(): void {
    if (!this.form) {
      return;
    }

    const previousFieldNames = new Set(
      this.registry.values().map((field) => field.name),
    );

    this.discovery.discover(this.form, this.registry);

    const values = this.serialize();
    const nextFieldNames = new Set(
      this.registry.values().map((field) => field.name),
    );

    for (const field of this.registry.values()) {
      field.register(values[field.name]);
      // registry will emit mount notifications via `onChange`.
    }

    for (const name of previousFieldNames) {
      if (nextFieldNames.has(name)) {
        continue;
      }

      const removed = this.registry.get(name);
      if (removed) {
        this.fieldErrorRenderer.applyErrors([removed], {});
      }

      // registry.unregister already handles node cleanup
      this.registry.unregister(name);
    }
  }

  private handleMutation = (mutations: MutationRecord[]) => {
    if (!mutations.some(isRuntimeMutationRelevant)) {
      return;
    }

    this.syncFields();
  };

  private applyValidationResult(
    result: ValidationResult<TValues>,
    values: NativeFormFlatValues,
  ): void {
    this.fieldErrorRenderer.normalizeFields(this.registry.values());

    this.errors = result.success ? {} : issuesToErrors(result.issues);
    for (const field of this.registry.values()) {
      field.setError(this.errors[field.name]);
    }
    this.applyNativeErrors();

    this.emitValidationEvent({
      type: "validation:end",
      errors: this.errors,
      values,
    });
  }

  private applyNativeErrors(): void {
    const observer = this.observer;

    if (observer) {
      observer.disconnect();
    }

    this.fieldErrorRenderer.applyErrors(this.registry.values(), this.errors);

    if (observer && this.form) {
      observer.observe(this.form, runtimeMutationObserverOptions);
    }
  }
}

function issuesToErrors(issues: ValidationIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    errors[issue.name] ??= issue.message;
  }

  return errors;
}

function toNativeFormElement(
  target: EventTarget | null,
): NativeFormElement | null {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target;
  }

  return null;
}
