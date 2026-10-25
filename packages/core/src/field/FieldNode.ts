import { NativeFormElement, NativeFormValue } from "../shared/types";
import { FieldState } from "./FieldState";

/** @public */
export class FieldNode {
  constructor(public readonly element: NativeFormElement) {}
  private dirty = false;

  private touched = false;

  private mounted = true;
  private initialValue: NativeFormValue | undefined = undefined;
  private stateValue: NativeFormValue | undefined = undefined;
  private error?: string;
  private validating = false;

  get name() {
    return this.element.name;
  }

  get tag() {
    return this.element.tagName.toLowerCase();
  }

  get type() {
    if (this.element instanceof HTMLInputElement) {
      return this.element.type;
    }

    if (this.element instanceof HTMLSelectElement) {
      return this.element.multiple ? "select-multiple" : "select";
    }

    return "textarea";
  }

  get value(): unknown {
    if (this.element instanceof HTMLInputElement) {
      switch (this.element.type) {
        case "checkbox":
          return this.element.checked;

        case "radio":
          return this.element.checked ? this.element.value : undefined;

        case "number":
          return this.element.value === ""
            ? undefined
            : this.element.valueAsNumber;

        case "file":
          return this.element.files;

        default:
          return this.element.value;
      }
    }

    if (this.element instanceof HTMLSelectElement) {
      return this.element.multiple
        ? Array.from(this.element.selectedOptions).map((o) => o.value)
        : this.element.value;
    }

    return this.element.value;
  }

  focus() {
    this.element.focus();
  }

  blur() {
    this.element.blur();
  }

  get isDirty() {
    return this.dirty;
  }

  get isTouched() {
    return this.touched;
  }

  get isMounted() {
    return this.mounted;
  }

  get isValidating() {
    return this.validating;
  }

  setValidating(validating: boolean) {
    this.validating = validating;
  }

  // --- New state API (replaces FieldStateStore) ---
  register(initialValue?: NativeFormValue) {
    this.mounted = true;
    this.initialValue = initialValue;
    this.stateValue = initialValue;
    this.dirty = false;
    this.touched = false;
    this.error = undefined;
    this.validating = false;
  }

  unregister() {
    this.mounted = false;
  }

  getState(): FieldState {
    return {
      name: this.name,
      dirty: this.dirty,
      touched: this.touched,
      mounted: this.mounted,
      initialValue: this.initialValue,
      value: this.stateValue,
      error: this.error,
      validating: this.validating,
    };
  }

  updateValue(value?: NativeFormValue) {
    const next = value === undefined ? (this.value as NativeFormValue) : value;
    this.stateValue = next;
    this.dirty = !isEqualValue(this.initialValue, next);
  }

  markTouched() {
    this.touched = true;
  }

  setError(message: string | undefined) {
    this.error = message;
  }

  reset(value: NativeFormValue | undefined) {
    this.initialValue = value;
    this.stateValue = value;
    this.dirty = false;
    this.touched = false;
    this.error = undefined;
    this.validating = false;
  }

  // --- Lifecycle helpers ---
  // Called when the browser emits input on the control
  handleInput(value?: NativeFormValue) {
    this.updateValue(value);
  }

  // Called when the browser emits change on the control
  handleChange(value?: NativeFormValue) {
    this.updateValue(value);
  }

  // Called when the control is blurred
  handleBlur() {
    this.markTouched();
  }

  // Called when the form is reset
  handleReset(value?: NativeFormValue) {
    const initial =
      value ?? this.initialValue ?? (this.value as NativeFormValue);
    this.reset(initial);
    this.setError(undefined);
  }

  // Called when the form is submitted (mark touched)
  handleSubmit() {
    this.markTouched();
  }
}

function isEqualValue(
  left: NativeFormValue | undefined,
  right: NativeFormValue | undefined,
): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  return left === right;
}
