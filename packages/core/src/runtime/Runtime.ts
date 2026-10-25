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
  getByPath,
  matchArrayItemPath,
  normalizePath,
  remapArrayItemIndex,
  shiftArrayItemIndex,
  toNestedValues,
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
  AsyncFieldValidator,
  SchemaLike,
  ValidationContext,
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
  nesting?: "flat" | "nested";
  /**
   * When true, preserves serialized values of fields that are removed from the DOM,
   * merging them into subsequent serializations and final submit.
   * @defaultValue false
   */
  preserveUnmountedValues?: boolean;
  schema?: SchemaLike<TValues>;
  validator?: Validator<TValues>;
  pipeline?: ValidationPipeline<TValues>;
  debounceMs?: number;
  asyncValidators?: Record<string, AsyncFieldValidator>;
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
  /**
   * Preserved values from fields that have been unmounted from the DOM
   * when `preserveUnmountedValues: true` is configured.
   */
  readonly preservedValues: Record<string, NativeFormValue>;
  mount(form: HTMLFormElement): void;
  unmount(): void;
  serialize(): NativeFormFlatValues;
  serializeFields(options?: SerializeFieldsOptions): NativeFormValues;
  validate(): Promise<ValidationResult<TValues>>;
  validateFields(
    fieldNames: readonly string[],
  ): Promise<ValidationResult<TValues>>;
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

  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly fieldValidationControllers = new Map<string, AbortController>();

  private submitting = false;

  private validating = false;

  private errors: Record<string, string> = {};

  private preservedValuesStore: Record<string, NativeFormValue> = Object.create(null);

  private isSyncingFields = false;

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
    this.clearDebounceTimers();
    this.abortAllValidations();

    if (this.form) {
      this.form.removeEventListener("submit", this.handleSubmit);
      this.form.removeEventListener("input", this.handleFieldUpdate);
      this.form.removeEventListener("change", this.handleFieldUpdate);
      this.form.removeEventListener("blur", this.handleFieldBlur, true);
      this.form.removeEventListener("reset", this.handleReset);
    }

    this.observer?.disconnect();
    this.observer = undefined;
    this.fieldErrorRenderer.applyErrors(this.registry.values(), {});
    this.registry.clear();

    this.form = undefined;
    this.errors = {};
    this.preservedValuesStore = Object.create(null);
    this.submitting = false;
    this.validating = false;

    this.emitFormEvent({
      type: "form:unmount",
    });

    this.listeners.clear();
  }

  private clearDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private abortAllValidations(): void {
    this.validationController?.abort();
    this.validationController = undefined;
    for (const controller of this.fieldValidationControllers.values()) {
      controller.abort();
    }
    this.fieldValidationControllers.clear();
    for (const field of this.registry.values()) {
      field.setValidating(false);
    }
  }

  private getAsyncValidator(name: string): AsyncFieldValidator | undefined {
    if (!this.options.asyncValidators) {
      return undefined;
    }

    if (this.options.asyncValidators[name]) {
      return this.options.asyncValidators[name];
    }

    const normalized = normalizePath(name);
    if (this.options.asyncValidators[normalized]) {
      return this.options.asyncValidators[normalized];
    }

    for (const [key, validator] of Object.entries(this.options.asyncValidators)) {
      if (normalizePath(key) === normalized) {
        return validator;
      }
    }

    return undefined;
  }

  serialize(): NativeFormFlatValues {
    if (!this.form) {
      if (this.options.preserveUnmountedValues) {
        return { ...this.preservedValuesStore };
      }
      throw new Error("Runtime is not mounted.");
    }

    if (this.options.preserveUnmountedValues) {
      if (!this.isSyncingFields) {
        this.syncFields();
      }
      const live = this.serializer.serialize(this.form);
      return {
        ...this.preservedValuesStore,
        ...live,
      };
    }

    return this.serializer.serialize(this.form);
  }

  serializeFields(options?: SerializeFieldsOptions): NativeFormValues {
    if (this.options.preserveUnmountedValues && this.form && !this.isSyncingFields) {
      this.syncFields();
    }

    const effectiveOptions: SerializeFieldsOptions = {
      ...this.options.serializeFieldsOptions,
      ...options,
    };
    const nesting = effectiveOptions.nesting ?? this.options.nesting ?? "flat";

    let nodes: Iterable<FieldNode> = this.registry.values();
    if (this.form) {
      const nodeList: FieldNode[] = [];
      const nodeMap = new Map(this.registry.values().map((n) => [n.element, n]));
      for (const control of Array.from(this.form.elements)) {
        if (
          (control instanceof HTMLInputElement ||
            control instanceof HTMLSelectElement ||
            control instanceof HTMLTextAreaElement) &&
          control.name
        ) {
          nodeList.push(nodeMap.get(control) ?? new FieldNode(control));
        }
      }
      nodes = nodeList;
    }

    if (this.options.preserveUnmountedValues) {
      const live = this.serializer.serializeFields(nodes, {
        ...effectiveOptions,
        nesting: "flat",
      }) as Record<string, unknown>;

      const merged = {
        ...this.preservedValuesStore,
        ...live,
      };

      if (nesting === "nested") {
        return toNestedValues(merged) as NativeFormValues;
      }
      return merged as NativeFormValues;
    }

    return this.serializer.serializeFields(nodes, options);
  }

  get fields(): FieldState[] {
    return this.getFieldStates();
  }

  get serializationMode(): SerializationMode {
    return this.options.serializationMode ?? "native";
  }

  get preservedValues(): Record<string, NativeFormValue> {
    if (this.options.preserveUnmountedValues && this.form && !this.isSyncingFields) {
      this.syncFields();
    }
    return Object.assign(Object.create(null), this.preservedValuesStore);
  }

  private extractCurrentValues(): TValues {
    if (!this.form) {
      if (this.options.preserveUnmountedValues) {
        let res: NativeFormValues = { ...this.preservedValuesStore };
        if (this.options.nesting === "nested") {
          res = toNestedValues(res);
        }
        return res as unknown as TValues;
      }
      return {} as TValues;
    }

    const serializeOpts: SerializeFieldsOptions = {
      ...this.options.serializeFieldsOptions,
      ...(this.options.nesting ? { nesting: this.options.nesting } : {}),
    };

    let values: NativeFormValues;
    if (this.serializationMode === "typed") {
      values = this.serializeFields(serializeOpts);
    } else {
      values = this.serialize();
      if (this.options.nesting === "nested") {
        values = toNestedValues(values);
      }
    }

    return values as unknown as TValues;
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

  async validateFields(
    fieldNames: readonly string[],
  ): Promise<ValidationResult<TValues>> {
    if (!this.form) {
      throw new Error("Runtime is not mounted.");
    }

    this.clearDebounceTimers();
    this.abortAllValidations();

    // Clear prior errors on targeted fields before running validation
    for (const name of fieldNames) {
      delete this.errors[name];
      const normalized = normalizePath(name);
      if (this.errors[normalized]) {
        delete this.errors[normalized];
      }
      const node = this.registry.get(name);
      node?.setError(undefined);
    }
    this.applyNativeErrors();

    const values = this.extractCurrentValues();
    const normalizedTargetNames = new Set(fieldNames.map(normalizePath));

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

    const result = await this.pipeline.validate(values, context);

    if (this.validationController === controller) {
      this.validating = false;
    }

    if (controller.signal.aborted) {
      return {
        success: false,
        issues: [],
      };
    }

    // Filter issues strictly to requested field names
    const filteredIssues: ValidationIssue[] = [];
    if (!result.success && result.issues) {
      for (const issue of result.issues) {
        if (normalizedTargetNames.has(normalizePath(issue.name))) {
          filteredIssues.push(issue);
        }
      }
    }

    // Update errors for the targeted fields
    for (const name of fieldNames) {
      const issue = filteredIssues.find(
        (iss) => normalizePath(iss.name) === normalizePath(name),
      );
      if (issue) {
        this.errors[name] = issue.message;
        const node = this.registry.get(name);
        node?.setError(issue.message);
      } else {
        delete this.errors[name];
        const normalized = normalizePath(name);
        if (this.errors[normalized]) {
          delete this.errors[normalized];
        }
        const node = this.registry.get(name);
        node?.setError(undefined);
      }
    }

    this.applyNativeErrors();

    // Two-tier async validation for requested fields that passed sync validation
    if (this.options.asyncValidators) {
      const asyncPromises: Promise<void>[] = [];
      const flat = (
        this.serializationMode === "typed" ? this.serialize() : values
      ) as unknown as NativeFormFlatValues;

      for (const name of fieldNames) {
        const issue = filteredIssues.find(
          (iss) => normalizePath(iss.name) === normalizePath(name),
        );
        if (issue) continue; // Skip async check if sync check failed

        const asyncValidator = this.getAsyncValidator(name);
        if (!asyncValidator) continue;

        const node = this.registry.get(name);
        node?.setValidating(true);

        const rawValue =
          (values as Record<string, unknown>)[name] ?? flat[name];

        asyncPromises.push(
          (async () => {
            try {
              const err = await asyncValidator(rawValue, {
                form: this.form!,
                signal: controller.signal,
              });
              if (err) {
                filteredIssues.push({ name, message: err });
                this.errors[name] = err;
                node?.setError(err);
              }
            } catch (error) {
              const msg =
                error instanceof Error ? error.message : String(error);
              filteredIssues.push({ name, message: msg });
              this.errors[name] = msg;
              node?.setError(msg);
            } finally {
              node?.setValidating(false);
            }
          })(),
        );
      }

      if (asyncPromises.length > 0) {
        await Promise.all(asyncPromises);
        this.applyNativeErrors();
      }
    }

    this.emitValidationEvent({
      type: "validation:end",
      errors: { ...this.errors },
      values,
    });

    if (filteredIssues.length > 0) {
      return {
        success: false,
        issues: filteredIssues,
      };
    }

    return {
      success: true,
      values: values as TValues,
    };
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

    this.clearDebounceTimers();
    this.abortAllValidations();

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

    // Step 2: Two-tier validation. Execute field-level async validators on submit
    if (
      this.options.asyncValidators &&
      Object.keys(this.options.asyncValidators).length > 0
    ) {
      const asyncIssues: ValidationIssue[] = [];
      const flat = (
        this.serializationMode === "typed" ? this.serialize() : values
      ) as unknown as NativeFormFlatValues;

      const promises: Promise<void>[] = [];
      for (const [name, validator] of Object.entries(
        this.options.asyncValidators,
      )) {
        const rawValue =
          (values as Record<string, unknown>)[name] ?? flat[name];
        const fieldNode = this.registry.get(name);
        if (fieldNode) {
          fieldNode.setValidating(true);
        }

        promises.push(
          (async () => {
            try {
              const err = await validator(rawValue, {
                form: this.form!,
                signal: validation.signal,
              });
              if (err) {
                asyncIssues.push({ name, message: err });
              }
            } catch (error) {
              const msg =
                error instanceof Error ? error.message : String(error);
              asyncIssues.push({ name, message: msg });
            } finally {
              fieldNode?.setValidating(false);
            }
          })(),
        );
      }

      await Promise.all(promises);

      if (asyncIssues.length > 0) {
        for (const issue of asyncIssues) {
          this.errors[issue.name] = issue.message;
          const node = this.registry.get(issue.name);
          node?.setError(issue.message);
        }
        this.applyNativeErrors();

        this.options.onInvalid?.(this.errors, values, event);
        this.emitFormEvent({
          type: "form:invalid",
          errors: this.errors,
          values,
        });

        return {
          success: false,
          issues: asyncIssues,
        };
      }
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

    if (this.options.preserveUnmountedValues) {
      if (
        element.name !== "__proto__" &&
        element.name !== "constructor" &&
        element.name !== "prototype"
      ) {
        if (value !== undefined) {
          this.preservedValuesStore[element.name] = value;
        } else {
          delete this.preservedValuesStore[element.name];
        }
      }
    }

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
    immediate = false,
  ): void {
    const debounceMs = this.options.debounceMs ?? 0;
    if (!immediate && debounceMs > 0) {
      const existing = this.debounceTimers.get(node.name);
      if (existing) {
        clearTimeout(existing);
      }
      const timer = setTimeout(() => {
        this.debounceTimers.delete(node.name);
        void this.executeFieldValidation(node, values);
      }, debounceMs);
      this.debounceTimers.set(node.name, timer);
    } else {
      const existing = this.debounceTimers.get(node.name);
      if (existing) {
        clearTimeout(existing);
        this.debounceTimers.delete(node.name);
      }
      void this.executeFieldValidation(node, values);
    }
  }

  private async executeFieldValidation(
    node: FieldNode,
    values: NativeFormFlatValues,
  ): Promise<void> {
    const fieldName = node.name;

    // Abort previous in-flight validation for this field
    const previousController = this.fieldValidationControllers.get(fieldName);
    if (previousController) {
      previousController.abort();
      this.fieldValidationControllers.delete(fieldName);
    }

    const fieldController = new AbortController();
    this.fieldValidationControllers.set(fieldName, fieldController);

    try {
      const validation = await this.runFieldValidation(node, values);
      const isStaleValidation =
        this.validationController !== undefined &&
        validation.signal !== this.validationController.signal;

      if (
        validation.aborted ||
        fieldController.signal.aborted ||
        isStaleValidation
      ) {
        return;
      }

      if (!validation.result.success) {
        this.options.onInvalid?.(this.errors, values);
        return;
      }

      // Step 2: Two-tier async validation.
      // If sync validation succeeded and an asyncValidator is configured for this field:
      const asyncValidator = this.getAsyncValidator(fieldName);
      if (asyncValidator && !fieldController.signal.aborted) {
        node.setValidating(true);
        this.emitFieldEvent({
          type: "field:update",
          field: fieldName,
          value: values[fieldName],
          values,
        });

        try {
          const context: ValidationContext = {
            form: this.form!,
            signal: fieldController.signal,
          };
          const rawValue = values[fieldName];
          const asyncError = await asyncValidator(rawValue, context);

          if (!fieldController.signal.aborted) {
            if (asyncError) {
              this.errors[fieldName] = asyncError;
              node.setError(asyncError);
              this.options.onInvalid?.(this.errors, values);
            } else if (this.errors[fieldName]) {
              delete this.errors[fieldName];
              node.setError(undefined);
            }
            this.applyNativeErrors();
          }
        } catch (error) {
          if (!fieldController.signal.aborted) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.errors[fieldName] = message;
            node.setError(message);
            this.applyNativeErrors();
            this.options.onInvalid?.(this.errors, values);
          }
        } finally {
          if (!fieldController.signal.aborted) {
            node.setValidating(false);
            this.emitValidationEvent({
              type: "validation:end",
              errors: { ...this.errors },
              values,
            });
            this.emitFieldEvent({
              type: "field:update",
              field: fieldName,
              value: values[fieldName],
              values,
            });
          }
        }
      }
    } finally {
      if (this.fieldValidationControllers.get(fieldName) === fieldController) {
        this.fieldValidationControllers.delete(fieldName);
      }
    }
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
    const hasPendingDebounce = this.debounceTimers.has(element.name);
    const shouldValidate =
      mode === "onBlur" ||
      mode === "onTouched" ||
      mode === "all" ||
      hasPendingDebounce;

    if (shouldValidate && node) {
      this.triggerFieldValidation(node, values, true);
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
    this.clearDebounceTimers();
    this.abortAllValidations();

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
    this.preservedValuesStore = Object.create(null);
    this.applyNativeErrors();

    this.emitFormEvent({
      type: "form:reset",
      values,
    });
  }

  getFieldState(name: string) {
    let node = this.registry.get(name);
    if (!node) {
      const normalized = normalizePath(name);
      for (const field of this.registry.values()) {
        if (normalizePath(field.name) === normalized) {
          node = field;
          break;
        }
      }
    }
    return node?.getState();
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

    if (this.options.preserveUnmountedValues) {
      const nextPreserved: Record<string, NativeFormValue> = {};
      let pChanged = false;
      for (const [path, val] of Object.entries(this.preservedValuesStore)) {
        const match = matchArrayItemPath(path, arrayName);
        if (!match) {
          nextPreserved[path] = val;
          continue;
        }
        if (match.index === index) {
          pChanged = true;
          continue;
        }
        if (match.index > index) {
          const shiftedPath = shiftArrayItemIndex(path, arrayName, index + 1, -1);
          nextPreserved[shiftedPath] = val;
          pChanged = true;
        } else {
          nextPreserved[path] = val;
        }
      }
      if (pChanged) {
        this.preservedValuesStore = nextPreserved;
      }
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

    if (this.options.preserveUnmountedValues) {
      const nextPreserved: Record<string, NativeFormValue> = {};
      let pChanged = false;
      for (const [path, val] of Object.entries(this.preservedValuesStore)) {
        const match = matchArrayItemPath(path, arrayName);
        if (!match) {
          nextPreserved[path] = val;
          continue;
        }
        if (match.index === indexA) {
          const newPath = remapArrayItemIndex(path, arrayName, indexA, indexB);
          nextPreserved[newPath] = val;
          pChanged = true;
        } else if (match.index === indexB) {
          const newPath = remapArrayItemIndex(path, arrayName, indexB, indexA);
          nextPreserved[newPath] = val;
          pChanged = true;
        } else {
          nextPreserved[path] = val;
        }
      }
      if (pChanged) {
        this.preservedValuesStore = nextPreserved;
      }
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

    if (this.options.preserveUnmountedValues) {
      const nextPreserved: Record<string, NativeFormValue> = {};
      let pChanged = false;
      for (const [path, val] of Object.entries(this.preservedValuesStore)) {
        const match = matchArrayItemPath(path, arrayName);
        if (!match) {
          nextPreserved[path] = val;
          continue;
        }
        const idx = match.index;
        if (idx === fromIndex) {
          const newPath = remapArrayItemIndex(path, arrayName, fromIndex, toIndex);
          nextPreserved[newPath] = val;
          pChanged = true;
        } else if (fromIndex < toIndex && idx > fromIndex && idx <= toIndex) {
          const newPath = remapArrayItemIndex(path, arrayName, idx, idx - 1);
          nextPreserved[newPath] = val;
          pChanged = true;
        } else if (fromIndex > toIndex && idx >= toIndex && idx < fromIndex) {
          const newPath = remapArrayItemIndex(path, arrayName, idx, idx + 1);
          nextPreserved[newPath] = val;
          pChanged = true;
        } else {
          nextPreserved[path] = val;
        }
      }
      if (pChanged) {
        this.preservedValuesStore = nextPreserved;
      }
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

    if (this.options.preserveUnmountedValues) {
      const nextPreserved: Record<string, NativeFormValue> = {};
      let pChanged = false;
      for (const [path, val] of Object.entries(this.preservedValuesStore)) {
        const match = matchArrayItemPath(path, arrayName);
        if (!match) {
          nextPreserved[path] = val;
          continue;
        }
        if (match.index >= index) {
          const shiftedPath = shiftArrayItemIndex(path, arrayName, index, 1);
          nextPreserved[shiftedPath] = val;
          pChanged = true;
        } else {
          nextPreserved[path] = val;
        }
      }
      if (pChanged) {
        this.preservedValuesStore = nextPreserved;
      }
    }
  }

  getFormState(): RuntimeFormState {
    const fields = this.getFieldStates();

    return {
      dirty: fields.some((field) => field.dirty),
      touched: fields.some((field) => field.touched),
      valid: Object.keys(this.errors).length === 0,
      submitting: this.submitting,
      validating: this.validating || fields.some((field) => field.validating),
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
      if (this.options.preserveUnmountedValues) {
        return this.preservedValuesStore[name];
      }
      return undefined;
    }

    if (this.options.preserveUnmountedValues && !this.isSyncingFields) {
      this.syncFields();
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
      // Check for bracket/dot alias (e.g. user.profile.name vs user[profile][name])
      const normalizedTarget = normalizePath(name);
      for (const field of this.registry.values()) {
        if (normalizePath(field.name) === normalizedTarget) {
          node = field;
          break;
        }
      }
    }

    if (!node) {
      if (this.options.preserveUnmountedValues) {
        if (name in this.preservedValuesStore) {
          return this.preservedValuesStore[name];
        }
        const normalizedTarget = normalizePath(name);
        for (const [key, val] of Object.entries(this.preservedValuesStore)) {
          if (normalizePath(key) === normalizedTarget) {
            return val;
          }
        }
      }

      if (this.options.nesting === "nested") {
        const nested = this.extractCurrentValues();
        const resolved = getByPath(nested, name);
        if (resolved !== undefined) {
          return resolved as NativeFormValue;
        }
      }
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
    if (!this.form || this.isSyncingFields) {
      return;
    }

    this.isSyncingFields = true;
    try {
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
          if (this.options.preserveUnmountedValues) {
            const val = field.value as NativeFormValue;
            if (
              field.name !== "__proto__" &&
              field.name !== "constructor" &&
              field.name !== "prototype"
            ) {
              if (val !== undefined) {
                this.preservedValuesStore[field.name] = val;
              } else {
                delete this.preservedValuesStore[field.name];
              }
            }
          }
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
    } finally {
      this.isSyncingFields = false;
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
    const targetIssue = resolveFieldError(issueMap, targetName);
    if (targetIssue) {
      this.errors[targetName] = targetIssue;
      targetField.setError(targetIssue);
    } else {
      delete this.errors[targetName];
      const normalizedTarget = normalizePath(targetName);
      if (this.errors[normalizedTarget]) {
        delete this.errors[normalizedTarget];
      }
      targetField.setError(undefined);
    }

    // 2. For other fields in the form: only update error state if they were
    // already touched or already had an error (e.g. cross-field validation rules).
    // Untouched fields must NOT show premature errors while typing elsewhere.
    for (const otherField of this.registry.values()) {
      if (otherField === targetField) continue;
      const name = otherField.name;
      const hadError = Boolean(resolveFieldError(this.errors, name));
      const isTouched = otherField.isTouched;

      if (hadError || isTouched) {
        const issue = resolveFieldError(issueMap, name);
        if (issue) {
          this.errors[name] = issue;
          otherField.setError(issue);
        } else {
          delete this.errors[name];
          const normalizedOther = normalizePath(name);
          if (this.errors[normalizedOther]) {
            delete this.errors[normalizedOther];
          }
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
      const error = resolveFieldError(this.errors, field.name);
      if (error && this.errors[field.name] === undefined) {
        this.errors[field.name] = error;
      }
      field.setError(error);
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

function resolveFieldError(
  errors: Record<string, string>,
  name: string,
): string | undefined {
  if (errors[name] !== undefined) {
    return errors[name];
  }

  const normalized = normalizePath(name);
  if (errors[normalized] !== undefined) {
    return errors[normalized];
  }

  for (const [key, msg] of Object.entries(errors)) {
    if (normalizePath(key) === normalized) {
      return msg;
    }
  }

  return undefined;
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
