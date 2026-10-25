import { Discovery } from "../discovery/Discovery";
import { FieldErrorRenderer } from "../errors/FieldErrorRenderer";
import { FieldNode } from "../field/FieldNode";
import { FieldRegistry } from "../field/FieldRegistry";
import { FieldState } from "../field/FieldState";
import {
  isRuntimeMutationRelevant,
  runtimeMutationObserverOptions,
} from "./RuntimeMutationPolicy";
import {
  matchArrayItemPath,
  remapArrayItemIndex,
  shiftArrayItemIndex,
} from "../Path";
import { Serializer, SerializeFieldsOptions } from "../serialization/Serializer";
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
  SerializationMode,
  ValidationMode,
} from "../shared/types";
import {
  SchemaLike,
  ValidationIssue,
  ValidationResult,
  Validator,
} from "../validation/Validation";

/** @public */
export interface RuntimeOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  mode?: ValidationMode;
  serializationMode?: SerializationMode;
  serializeFieldsOptions?: SerializeFieldsOptions;
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

/** @public */
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

/** @public */
export interface RuntimePublicApi<
  TValues extends NativeFormValues = NativeFormValues,
> {
  readonly fields: FieldState[];
  readonly serializationMode: SerializationMode;
  mount(form: HTMLFormElement): void;
  unmount(): void;
  serialize(): NativeFormFlatValues;
  serializeFields(options?: SerializeFieldsOptions): NativeFormValues;
  validate(): Promise<ValidationResult<TValues>>;
  submit(event?: SubmitEvent): Promise<ValidationResult<TValues>>;
  subscribe(listener: RuntimeListener): () => void;
  unsubscribe(listener: RuntimeListener): void;
  getFieldValue(name: string): NativeFormValue | undefined;
  getFieldState(name: string): FieldState | undefined;
  getFieldStates(): FieldState[];
  getFormState(): RuntimeFormState;
  setOptions(options: Partial<RuntimeOptions<TValues>>): void;
  removeArrayItem(arrayName: string, index: number): void;
  swapArrayItems(arrayName: string, indexA: number, indexB: number): void;
  moveArrayItem(arrayName: string, fromIndex: number, toIndex: number): void;
  insertArrayItem(arrayName: string, index: number): void;
}

type FieldRuntimeEvent = Extract<RuntimeEvent, { type: `field:${string}` }>;
type ValidationRuntimeEvent = Extract<
  RuntimeEvent,
  { type: `validation:${string}` }
>;
type FormRuntimeEvent = Extract<RuntimeEvent, { type: `form:${string}` }>;

/** @public */
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

  private pipeline: ValidationPipeline<TValues>;

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

    const values = this.extractCurrentValues() as unknown as NativeFormFlatValues;

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

  serializeFields(options?: SerializeFieldsOptions): NativeFormValues {
    if (this.form) {
      const nodes: FieldNode[] = [];
      const nodeMap = new Map(this.registry.values().map((n) => [n.element, n]));
      for (const control of Array.from(this.form.elements)) {
        if (
          (control instanceof HTMLInputElement ||
            control instanceof HTMLSelectElement ||
            control instanceof HTMLTextAreaElement) &&
          control.name
        ) {
          nodes.push(nodeMap.get(control) ?? new FieldNode(control));
        }
      }
      return this.serializer.serializeFields(nodes, options);
    }
    return this.serializer.serializeFields(this.registry.values(), options);
  }

  get fields(): FieldState[] {
    return this.getFieldStates();
  }

  get serializationMode(): SerializationMode {
    return this.options.serializationMode ?? "native";
  }

  private extractCurrentValues(): TValues {
    if (!this.form) {
      return {} as TValues;
    }
    if (this.serializationMode === "typed") {
      return this.serializeFields(
        this.options.serializeFieldsOptions,
      ) as unknown as TValues;
    }
    return this.serialize() as unknown as TValues;
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

  async validate() {
    const validation = await this.runValidation(this.extractCurrentValues());

    return validation.result;
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

    const values = this.extractCurrentValues();
    // lifecycle: mark fields as submitted/touched
    for (const field of this.registry.values()) {
      field.handleSubmit();
      this.emitFieldEvent({
        type: "field:submit",
        field: field.name,
      });
    }

    const validation = await this.runValidation(values);
    const isStaleValidation =
      this.validationController !== undefined &&
      validation.signal !== this.validationController.signal;

    if (validation.aborted || isStaleValidation) {
      return validation.result;
    }

    if (!validation.result.success) {
      this.options.onInvalid?.(this.errors, values, event);
      this.emitFormEvent({
        type: "form:invalid",
        errors: this.errors,
        values,
      });

      return validation.result;
    }

    this.submitting = true;

    this.emitFormEvent({
      type: "form:submit",
      values: validation.result.values,
    });

    try {
      await this.options.onSubmit?.(validation.result.values, event);
    } finally {
      this.submitting = false;
    }

    return validation.result;
  }

  private async runValidation(values: NativeFormValues): Promise<{
    result: ValidationResult<TValues>;
    signal: AbortSignal;
    aborted: boolean;
  }> {
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

    return {
      result,
      signal: controller.signal,
      aborted: controller.signal.aborted,
    };
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

    const mode = this.options.mode ?? "onChange";
    const shouldValidate =
      mode === "onChange" ||
      mode === "all" ||
      (mode === "onTouched" && node.isTouched);

    if (shouldValidate) {
      this.triggerFieldValidation(node, values);
    }

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

    const mode = this.options.mode ?? "onChange";
    const shouldValidate =
      mode === "onChange" ||
      mode === "all" ||
      (mode === "onTouched" && node.isTouched);

    if (shouldValidate) {
      this.triggerFieldValidation(node, values);
    }

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

    const mode = this.options.mode ?? "onChange";
    const shouldValidate =
      mode === "onChange" ||
      mode === "all" ||
      (mode === "onTouched" && node.isTouched);

    if (shouldValidate) {
      this.triggerFieldValidation(node, values);
    }

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

    const values = this.extractCurrentValues() as unknown as NativeFormFlatValues;
    const value = values[element.name];
    const node = this.registry.get(element.name);

    if (!node) {
      return undefined;
    }

    return { node, values, value };
  }

  private triggerFieldValidation(
    node: FieldNode,
    values: NativeFormFlatValues,
  ): void {
    void this.runFieldValidation(node, values).then((validation) => {
      const isStaleValidation =
        this.validationController !== undefined &&
        validation.signal !== this.validationController.signal;

      if (
        validation.aborted ||
        isStaleValidation ||
        validation.result.success
      ) {
        return;
      }

      this.options.onInvalid?.(this.errors, values);
    });
  }

  private handleFieldBlur = (event: Event) => {
    const element = toNativeFormElement(event.target);

    if (!element?.name || !this.form) return;

    this.ensureField(element);

    const values = this.extractCurrentValues() as unknown as NativeFormFlatValues;
    const value = values[element.name];

    const node = this.registry.get(element.name);
    node?.handleBlur();

    const mode = this.options.mode ?? "onChange";
    const shouldValidate =
      mode === "onBlur" || mode === "onTouched" || mode === "all";

    if (shouldValidate && node) {
      this.triggerFieldValidation(node, values);
    }

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
  ): Promise<{
    result: ValidationResult<TValues>;
    signal: AbortSignal;
    aborted: boolean;
  }> {
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
      this.applyFieldValidationResult(field, result, values);

      if (this.validationController === controller) {
        this.validating = false;
      }
    }

    return {
      result,
      signal: controller.signal,
      aborted: controller.signal.aborted,
    };
  }

  private handleReset = () => {
    queueMicrotask(() => {
      if (!this.form) return;

      const values = this.extractCurrentValues() as unknown as NativeFormFlatValues;

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

  setOptions(options: Partial<RuntimeOptions<TValues>>): void {
    Object.assign(this.options, options);
    if (
      options.schema !== undefined ||
      options.validator !== undefined ||
      options.pipeline !== undefined
    ) {
      this.pipeline =
        options.pipeline ??
        createValidationPipeline({
          schema: options.schema,
          validator: options.validator,
        });
    }
  }

  removeArrayItem(arrayName: string, index: number): void {
    const nextErrors: Record<string, string> = {};
    let changed = false;

    for (const [path, error] of Object.entries(this.errors)) {
      const match = matchArrayItemPath(path, arrayName);
      if (!match) {
        nextErrors[path] = error;
        continue;
      }

      if (match.index === index) {
        changed = true;
        continue;
      }

      if (match.index > index) {
        const shiftedPath = shiftArrayItemIndex(path, arrayName, index + 1, -1);
        nextErrors[shiftedPath] = error;
        changed = true;
      } else {
        nextErrors[path] = error;
      }
    }

    if (changed) {
      this.errors = nextErrors;
      this.fieldErrorRenderer.applyErrors(this.registry.values(), this.errors);
      this.emitValidationEvent({
        type: "validation:end",
        errors: { ...this.errors },
        values: this.extractCurrentValues() as unknown as NativeFormValues,
      });
    }
  }

  swapArrayItems(arrayName: string, indexA: number, indexB: number): void {
    if (indexA === indexB) return;

    const nextErrors: Record<string, string> = {};
    let changed = false;

    for (const [path, error] of Object.entries(this.errors)) {
      const match = matchArrayItemPath(path, arrayName);
      if (!match) {
        nextErrors[path] = error;
        continue;
      }

      if (match.index === indexA) {
        const newPath = remapArrayItemIndex(path, arrayName, indexA, indexB);
        nextErrors[newPath] = error;
        changed = true;
      } else if (match.index === indexB) {
        const newPath = remapArrayItemIndex(path, arrayName, indexB, indexA);
        nextErrors[newPath] = error;
        changed = true;
      } else {
        nextErrors[path] = error;
      }
    }

    if (changed) {
      this.errors = nextErrors;
      this.fieldErrorRenderer.applyErrors(this.registry.values(), this.errors);
      this.emitValidationEvent({
        type: "validation:end",
        errors: { ...this.errors },
        values: this.extractCurrentValues() as unknown as NativeFormValues,
      });
    }
  }

  moveArrayItem(arrayName: string, fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;

    const nextErrors: Record<string, string> = {};
    let changed = false;

    for (const [path, error] of Object.entries(this.errors)) {
      const match = matchArrayItemPath(path, arrayName);
      if (!match) {
        nextErrors[path] = error;
        continue;
      }

      const idx = match.index;
      if (idx === fromIndex) {
        const newPath = remapArrayItemIndex(path, arrayName, fromIndex, toIndex);
        nextErrors[newPath] = error;
        changed = true;
      } else if (fromIndex < toIndex && idx > fromIndex && idx <= toIndex) {
        const newPath = remapArrayItemIndex(path, arrayName, idx, idx - 1);
        nextErrors[newPath] = error;
        changed = true;
      } else if (fromIndex > toIndex && idx >= toIndex && idx < fromIndex) {
        const newPath = remapArrayItemIndex(path, arrayName, idx, idx + 1);
        nextErrors[newPath] = error;
        changed = true;
      } else {
        nextErrors[path] = error;
      }
    }

    if (changed) {
      this.errors = nextErrors;
      this.fieldErrorRenderer.applyErrors(this.registry.values(), this.errors);
      this.emitValidationEvent({
        type: "validation:end",
        errors: { ...this.errors },
        values: this.extractCurrentValues() as unknown as NativeFormValues,
      });
    }
  }

  insertArrayItem(arrayName: string, index: number): void {
    const nextErrors: Record<string, string> = {};
    let changed = false;

    for (const [path, error] of Object.entries(this.errors)) {
      const match = matchArrayItemPath(path, arrayName);
      if (!match) {
        nextErrors[path] = error;
        continue;
      }

      if (match.index >= index) {
        const shiftedPath = shiftArrayItemIndex(path, arrayName, index, 1);
        nextErrors[shiftedPath] = error;
        changed = true;
      } else {
        nextErrors[path] = error;
      }
    }

    if (changed) {
      this.errors = nextErrors;
      this.fieldErrorRenderer.applyErrors(this.registry.values(), this.errors);
      this.emitValidationEvent({
        type: "validation:end",
        errors: { ...this.errors },
        values: this.extractCurrentValues() as unknown as NativeFormValues,
      });
    }
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
      values: this.extractCurrentValues() as unknown as NativeFormFlatValues,
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

  getFieldValue(name: string): NativeFormValue | undefined {
    if (!this.form) {
      return undefined;
    }

    let node = this.registry.get(name);
    if (!node) {
      const control = this.form.elements.namedItem(name);
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        this.ensureField(control);
        node = this.registry.get(name);
      }
    }

    if (!node) {
      return undefined;
    }

    if (
      node.element instanceof HTMLInputElement &&
      node.element.type === "radio"
    ) {
      const item = this.form.elements.namedItem(name);
      if (item) {
        if (
          "value" in item &&
          typeof (item as any).value === "string" &&
          (item as any).value !== ""
        ) {
          return (item as any).value;
        }
        if ("length" in item) {
          for (const el of Array.from(item as any as Iterable<Element>)) {
            if (el instanceof HTMLInputElement && el.checked) {
              return el.value;
            }
          }
        }
      }
      return node.element.checked ? node.element.value : undefined;
    }

    if (
      node.element instanceof HTMLInputElement &&
      node.element.type === "checkbox"
    ) {
      const item = this.form.elements.namedItem(name);
      if (
        item &&
        ("length" in item || item instanceof RadioNodeList) &&
        (item as any).length > 1
      ) {
        const checkedValues: string[] = [];
        for (const el of Array.from(item as any as Iterable<Element>)) {
          if (el instanceof HTMLInputElement && el.checked) {
            checkedValues.push(el.value || "on");
          }
        }
        return checkedValues as unknown as NativeFormValue;
      }
      return node.element.checked as unknown as NativeFormValue;
    }

    return (node.value ?? undefined) as NativeFormValue | undefined;
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

    const previousFields = this.registry.values();
    const previousFieldMap = new Map(
      previousFields.map((field) => [field.name, field]),
    );

    const activeControlNames = new Set<string>();
    for (const control of Array.from(this.form.elements)) {
      if (
        (control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLTextAreaElement) &&
        control.name
      ) {
        activeControlNames.add(control.name);
      }
    }

    for (const field of previousFields) {
      if (!activeControlNames.has(field.name)) {
        this.fieldErrorRenderer.applyErrors([field], {});
        delete this.errors[field.name];
      }
    }

    this.discovery.discover(this.form, this.registry);

    const values = this.extractCurrentValues() as unknown as NativeFormFlatValues;

    for (const field of this.registry.values()) {
      if (
        !previousFieldMap.has(field.name) ||
        previousFieldMap.get(field.name) !== field
      ) {
        field.register(values[field.name]);
      }
    }
  }

  private handleMutation = (mutations: MutationRecord[]) => {
    if (!mutations.some(isRuntimeMutationRelevant)) {
      return;
    }

    this.syncFields();
  };

  private applyFieldValidationResult(
    targetField: FieldNode,
    result: ValidationResult<TValues>,
    values: NativeFormFlatValues,
  ): void {
    const issueMap = result.success ? {} : issuesToErrors(result.issues);
    const targetName = targetField.name;

    // 1. Update the active field being edited
    const targetIssue = issueMap[targetName];
    if (targetIssue) {
      this.errors[targetName] = targetIssue;
      targetField.setError(targetIssue);
    } else {
      delete this.errors[targetName];
      targetField.setError(undefined);
    }

    // 2. For other fields in the form: only update error state if they were
    // already touched or already had an error (e.g. cross-field validation rules).
    // Untouched fields must NOT show premature errors while typing elsewhere.
    for (const otherField of this.registry.values()) {
      if (otherField === targetField) continue;
      const name = otherField.name;
      const hadError = Boolean(this.errors[name]);
      const isTouched = otherField.isTouched;

      if (hadError || isTouched) {
        const issue = issueMap[name];
        if (issue) {
          this.errors[name] = issue;
          otherField.setError(issue);
        } else {
          delete this.errors[name];
          otherField.setError(undefined);
        }
      }
    }

    this.fieldErrorRenderer.normalizeFields(this.registry.values());
    this.applyNativeErrors();

    this.emitValidationEvent({
      type: "validation:end",
      errors: { ...this.errors },
      values,
    });
  }

  private applyValidationResult(
    result: ValidationResult<TValues>,
    values: NativeFormValues,
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
