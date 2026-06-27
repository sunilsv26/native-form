import { Discovery } from "./Discovery";
import { FieldNode } from "./FieldNode";
import { FieldRegistry } from "./FieldRegistry";
import { Serializer } from "./Serializer";
import {
  createValidationPipeline,
  ValidationPipeline,
} from "./ValidationPipeline";
import {
  NativeFormElement,
  NativeFormValue,
  NativeFormValues,
  RuntimeEvent,
  RuntimeListener,
} from "./types";
import {
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
  pipeline?: ValidationPipeline<TValues>;
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
        this.notify({ type: "field:mount", field: e.field.name });
      } else {
        this.notify({ type: "field:unmount", field: e.field.name });
      }
    };
  }

  mount(form: HTMLFormElement) {
    this.form = form;
    this.syncFields();
    normalizeErrorLabelsForRegistry(this.registry);

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
    // lifecycle: mark fields as submitted/touched
    for (const field of this.registry.values()) {
      field.handleSubmit();
      this.notify({
        type: "field:submit",
        field: field.name,
      });
    }

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
    for (const field of this.registry.values()) {
      field.setError(this.errors[field.name]);
    }
    this.applyNativeErrors();

    const result = await this.pipeline.validate(values, {
      form: this.form,
      signal: this.validationController.signal,
      fields: this.registry.values(),
    });

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

    const node = this.registry.get(element.name);
    // lifecycle: input/change -> update value once
    if (event.type === "input") {
      node?.handleInput(value);
    } else if (event.type === "change") {
      node?.handleChange(value);
    } else {
      node?.updateValue(value);
    }

    if (!node) {
      return;
    }

    void this.runFieldValidation(node, values).then(() => {
      this.options.onInvalid?.(this.errors, values);
    });

    this.notify({
      type:
        event.type === "input"
          ? "field:input"
          : event.type === "change"
            ? "field:change"
            : "field:update",
      field: element.name,
      value,
      values,
    });

    // Normalized generic update signal for any value change source.
    if (event.type === "input" || event.type === "change") {
      this.notify({
        type: "field:update",
        field: element.name,
        value,
        values,
      });
    }
  };

  private handleFieldBlur = (event: Event) => {
    const element = toNativeFormElement(event.target);

    if (!element?.name || !this.form) return;

    this.ensureField(element);

    const values = this.serialize();
    const value = values[element.name];

    const node = this.registry.get(element.name);
    node?.handleBlur();

    this.notify({
      type: "field:blur",
      field: element.name,
      value,
      values,
    });
  };

  private async runFieldValidation(
    field: FieldNode,
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
    for (const f of this.registry.values()) {
      f.setError(this.errors[f.name]);
    }
    this.applyNativeErrors();

    const result = await this.pipeline.validateField(field, values, {
      form: this.form,
      signal: this.validationController.signal,
      fields: this.registry.values(),
    });

    if (!this.validationController.signal.aborted) {
      this.applyValidationResult(result, values);
      this.validating = false;
    }

    return result;
  }

  private handleReset = () => {
    queueMicrotask(() => {
      if (!this.form) return;

      const values = this.serialize();

      for (const field of this.registry.values()) {
        field.handleReset(values[field.name]);
        this.notify({
          type: "field:reset",
          field: field.name,
          value: values[field.name],
          values,
        });
      }
      this.errors = {};
      this.applyNativeErrors();

      this.notify({
        type: "form:reset",
        values,
      });
    });
  };

  getFieldState(name: string) {
    return this.registry.get(name)?.getState();
  }

  getFieldStates() {
    return this.registry.values().map((f) => f.getState());
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
    const node = this.registry.get(element.name)!;
    node.register(this.getFieldValue(element.name));
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
      field.register(values[field.name]);
      // registry will emit mount notifications via `onChange`.
    }

    for (const name of previous) {
      if (next.has(name)) {
        continue;
      }

      // registry.unregister already handles node cleanup
      this.registry.unregister(name);
    }
  }

  private handleMutation = (mutations: MutationRecord[]) => {
    if (!mutations.some((mutation) => this.isRelevantMutation(mutation))) {
      return;
    }

    this.syncFields();
  };

  private isRelevantMutation(mutation: MutationRecord): boolean {
    if (mutation.type === "attributes") {
      return isNativeFormControl(mutation.target as Node);
    }

    if (mutation.type === "childList") {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

      return nodes.some((node) => {
        if (isErrorLabel(node)) {
          return false;
        }

        return isNativeFormControl(node) || containsNativeFormControl(node);
      });
    }

    return false;
  }

  private applyValidationResult(
    result: ValidationResult<TValues>,
    values: NativeFormValues,
  ): void {
    // Consolidate any duplicate/legacy inline error labels before applying
    // the validation result so we don't accumulate duplicates during
    // repeated validation runs.
    normalizeErrorLabelsForRegistry(this.registry);

    this.errors = result.success ? {} : issuesToErrors(result.issues);
    for (const field of this.registry.values()) {
      field.setError(this.errors[field.name]);
    }
    this.applyNativeErrors();

    this.notify({
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

    for (const field of this.registry.values()) {
      field.element.setCustomValidity(this.errors[field.name] ?? "");
      field.updateError(this.errors[field.name]);
    }

    if (observer && this.form) {
      observer.observe(this.form, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["name", "disabled"],
      });
    }
  }

  private clearFieldError(name: string): boolean {
    if (!(name in this.errors)) {
      return false;
    }

    this.errors = { ...this.errors };
    delete this.errors[name];
    for (const field of this.registry.values()) {
      field.setError(this.errors[field.name]);
    }
    this.applyNativeErrors();
    return true;
  }
}

function issuesToErrors(issues: ValidationIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    errors[issue.name] ??= issue.message;
  }

  return errors;
}

// Consolidate legacy or duplicate inline error labels placed next to controls.
function normalizeErrorLabelsForRegistry(registry: FieldRegistry) {
  for (const field of registry.values()) {
    let node = field.element.nextElementSibling;
    const candidates: HTMLElement[] = [];

    while (node) {
      if (node instanceof HTMLElement) {
        const id = node.id ?? "";
        const aria = node.getAttribute("aria-live");

        const isRuntimeLabel =
          node.dataset.nativeFormError === "true" ||
          id.startsWith("native-form-error-") ||
          aria === "polite";

        if (isRuntimeLabel) {
          candidates.push(node);
          node = node.nextElementSibling;
          continue;
        }
      }

      break;
    }

    if (candidates.length === 0) continue;

    // Keep the first, remove the rest, and mark the kept node.
    const keep = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      candidates[i].remove();
    }

    keep.dataset.nativeFormError = "true";
    keep.setAttribute("data-for", field.name);
  }
}

function isNativeFormControl(node: Node): boolean {
  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  );
}

function containsNativeFormControl(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    Boolean(node.querySelector("input[name], select[name], textarea[name]"))
  );
}

function isErrorLabel(node: Node): boolean {
  return node instanceof HTMLElement && node.dataset.nativeFormError === "true";
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
