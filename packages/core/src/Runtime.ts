import { Discovery } from "./Discovery";
import { FieldNode } from "./FieldNode";
import { FieldRegistry } from "./FieldRegistry";
import { FieldStateStore } from "./FieldStateStore";
import { Serializer } from "./Serializer";
import {
  NativeFormElement,
  NativeFormValue,
  NativeFormValues,
  RuntimeEvent,
  RuntimeListener,
} from "./types";
import {
  createValidator,
  SchemaLike,
  ValidationIssue,
  ValidationResult,
  Validator,
} from "./Validation";

export interface RuntimeOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  schema?: SchemaLike<TValues>;
  validator?: Validator<TValues>;
  onSubmit?: (values: TValues, event?: SubmitEvent) => void | Promise<void>;
  onInvalid?: (
    errors: Record<string, string>,
    values: NativeFormValues,
    event?: SubmitEvent,
  ) => void;
}

export class Runtime<TValues extends NativeFormValues = NativeFormValues> {
  private readonly registry = new FieldRegistry();

  private readonly discovery = new Discovery();

  private readonly serializer = new Serializer();

  private form?: HTMLFormElement;

  private readonly listeners = new Set<RuntimeListener>();

  private readonly fieldStateStore = new FieldStateStore();

  private observer?: MutationObserver;

  private validationController?: AbortController;

  private submitting = false;

  private validating = false;

  private errors: Record<string, string> = {};

  private readonly validator?: Validator<TValues>;

  constructor(private readonly options: RuntimeOptions<TValues> = {}) {
    const schema = options.schema ?? options.validator;

    this.validator = schema ? createValidator(schema) : undefined;
  }

  mount(form: HTMLFormElement) {
    this.form = form;
    this.syncFields();

    const values = this.serialize();

    for (const field of this.registry.getAll()) {
      this.fieldStateStore.register(field.name, values[field.name]);
    }

    form.addEventListener("submit", this.handleSubmit);
    form.addEventListener("input", this.handleFieldUpdate);
    form.addEventListener("change", this.handleFieldUpdate);
    form.addEventListener("blur", this.handleFieldBlur, true);
    form.addEventListener("reset", this.handleReset);
    this.observer = new MutationObserver(this.handleMutation);
    this.observer.observe(form, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["name", "disabled"],
    });
    this.notify({
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
    this.registry.clear();

    this.form = undefined;
    this.errors = {};
    this.submitting = false;
    this.validating = false;

    this.notify({
      type: "form:unmount",
    });

    this.listeners.clear();
    this.fieldStateStore.clear();
  }

  serialize() {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    return this.serializer.serialize(this.form);
  }

  get fields() {
    return this.registry.values();
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

  submit(event?: SubmitEvent) {
    return this.runSubmit(event);
  }

  validate() {
    return this.runValidation(this.serialize());
  }

  private handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void this.runSubmit(event);
  };

  private async runSubmit(
    event?: SubmitEvent,
  ): Promise<ValidationResult<TValues>> {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    const values = this.serialize();
    const validation = await this.runValidation(values);

    if (!validation.success) {
      this.options.onInvalid?.(this.errors, values, event);
      this.notify({
        type: "form:invalid",
        errors: this.errors,
        values,
      });

      return validation;
    }

    this.submitting = true;

    this.notify({
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
    values: NativeFormValues,
  ): Promise<ValidationResult<TValues>> {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    this.validationController?.abort();
    this.validationController = new AbortController();
    this.validating = true;

    this.notify({
      type: "validation:start",
      values,
    });

    this.errors = {};
    this.fieldStateStore.setErrors(this.errors);
    this.applyNativeErrors();

    const nativeIssues = this.validator ? [] : this.getNativeValidationIssues();

    if (nativeIssues.length > 0) {
      const result: ValidationResult<TValues> = {
        success: false,
        issues: nativeIssues,
      };

      this.applyValidationResult(result, values);
      this.validating = false;

      return result;
    }

    const result = (await this.validator?.validate(values, {
      form: this.form,
      signal: this.validationController.signal,
    })) ?? {
      success: true,
      values: values as TValues,
    };

    if (!this.validationController.signal.aborted) {
      this.applyValidationResult(result, values);
      this.validating = false;
    }

    return result;
  }

  private handleFieldUpdate = (event: Event) => {
    const element = toNativeFormElement(event.target);

    if (!element?.name || !this.form) return;

    this.ensureField(element);

    const values = this.serialize();
    const value = values[element.name];

    this.fieldStateStore.updateValue(element.name, value);

    void this.runValidation(values).then(() => {
      this.options.onInvalid?.(this.errors, values);
    });

    this.notify({
      type: "field:update",
      field: element.name,
      value,
      values,
    });
  };

  private handleFieldBlur = (event: Event) => {
    const element = toNativeFormElement(event.target);

    if (!element?.name || !this.form) return;

    this.ensureField(element);

    const values = this.serialize();
    const value = values[element.name];

    this.fieldStateStore.markTouched(element.name);

    this.notify({
      type: "field:blur",
      field: element.name,
      value,
      values,
    });
  };

  private handleReset = () => {
    queueMicrotask(() => {
      if (!this.form) return;

      const values = this.serialize();

      this.fieldStateStore.reset(values);
      this.errors = {};
      this.applyNativeErrors();

      this.notify({
        type: "form:reset",
        values,
      });
    });
  };

  getFieldState(name: string) {
    return this.fieldStateStore.get(name);
  }

  getFieldStates() {
    return this.fieldStateStore.getAll();
  }

  getFormState() {
    const fields = this.getFieldStates();

    return {
      dirty: fields.some((field) => field.dirty),
      touched: fields.some((field) => field.touched),
      valid: Object.keys(this.errors).length === 0,
      submitting: this.submitting,
      validating: this.validating,
      errors: { ...this.errors },
      fields,
      values: this.form ? this.serialize() : ({} as NativeFormValues),
    };
  }

  private ensureField(element: NativeFormElement): void {
    if (this.registry.has(element.name)) {
      return;
    }

    this.registry.register(new FieldNode(element));
    this.fieldStateStore.register(
      element.name,
      this.getFieldValue(element.name),
    );
  }

  private getFieldValue(name: string): NativeFormValue | undefined {
    if (!this.form) {
      return undefined;
    }

    return this.serializer.serialize(this.form)[name];
  }

  private syncFields(): void {
    if (!this.form) {
      return;
    }

    const previous = new Set(this.registry.values().map((field) => field.name));

    this.discovery.discover(this.form, this.registry);

    const values = this.serialize();
    const next = new Set(this.registry.values().map((field) => field.name));

    for (const field of this.registry.values()) {
      this.fieldStateStore.register(field.name, values[field.name]);

      if (!previous.has(field.name)) {
        this.notify({
          type: "field:mount",
          field: field.name,
        });
      }
    }

    for (const name of previous) {
      if (next.has(name)) {
        continue;
      }

      this.fieldStateStore.unregister(name);
      this.registry.unregister(name);
      this.notify({
        type: "field:unmount",
        field: name,
      });
    }
  }

  private handleMutation = () => {
    this.syncFields();
  };

  private applyValidationResult(
    result: ValidationResult<TValues>,
    values: NativeFormValues,
  ): void {
    this.errors = result.success ? {} : issuesToErrors(result.issues);
    this.fieldStateStore.setErrors(this.errors);
    this.applyNativeErrors();

    this.notify({
      type: "validation:end",
      errors: this.errors,
      values,
    });
  }

  private applyNativeErrors(): void {
    for (const field of this.registry.values()) {
      field.element.setCustomValidity(this.errors[field.name] ?? "");
    }
  }

  private clearFieldError(name: string): boolean {
    if (!(name in this.errors)) {
      return false;
    }

    this.errors = { ...this.errors };
    delete this.errors[name];
    this.fieldStateStore.setErrors(this.errors);
    this.applyNativeErrors();
    return true;
  }

  private getNativeValidationIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const field of this.registry.values()) {
      const validationMessage = field.element.validationMessage;

      if (validationMessage) {
        issues.push({
          name: field.name,
          message: validationMessage,
        });
      }
    }

    return issues;
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
