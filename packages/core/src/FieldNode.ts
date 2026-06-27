import { NativeFormElement, NativeFormValue } from "./types";
import { FieldState } from "./FieldState";

export class FieldNode {
  private static nextErrorId = 0;

  private readonly errorId = `native-form-error-${FieldNode.nextErrorId++}`;

  private errorElement?: HTMLElement;

  constructor(public readonly element: NativeFormElement) {}
  private dirty = false;

  private touched = false;

  private mounted = true;
  private initialValue: NativeFormValue | undefined = undefined;
  private stateValue: NativeFormValue | undefined = undefined;
  private error?: string;
  // Optional callback to report per-field state changes (used by Runtime).
  onChange?: (state: FieldState) => void;

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

  private findExistingErrorElement(): HTMLElement | undefined {
    const elems = this.findExistingErrorElements();
    return elems.length > 0 ? elems[0] : undefined;
  }

  // Collect contiguous sibling elements immediately after the control that
  // are marked as runtime error labels. This also catches legacy labels
  // that were created without the `data-for` attribute.
  private findExistingErrorElements(): HTMLElement[] {
    const results: HTMLElement[] = [];
    let node = this.element.nextElementSibling;

    while (node) {
      if (node instanceof HTMLElement) {
        const id = node.id ?? "";
        const aria = node.getAttribute("aria-live");

        const isErrorLabel =
          node.dataset.nativeFormError === "true" ||
          id.startsWith("native-form-error-") ||
          aria === "polite";

        if (isErrorLabel) {
          results.push(node);
          node = node.nextElementSibling;
          continue;
        }
      }

      // stop scanning when we hit a non-error sibling
      break;
    }

    return results;
  }

  private removeErrorElements(elements: HTMLElement[]): void {
    for (const element of elements) {
      element.remove();
    }
  }

  attachErrorElement() {
    if (this.errorElement) {
      // Ensure we don't have multiple stale error siblings left behind.
      const existing = this.findExistingErrorElements();

      if (existing.length > 1) {
        this.errorElement = existing[0];
        this.removeErrorElements(existing.slice(1));
        return;
      }

      if (existing.length === 0) {
        // Stored reference is stale; clear and continue to recreate.
        this.errorElement = undefined;
      } else {
        // Single existing element is present and referenced; nothing to do.
        return;
      }
    }

    const existing = this.findExistingErrorElements();

    if (existing.length > 0) {
      this.errorElement = existing[0];
      this.removeErrorElements(existing.slice(1));
      return;
    }

    const error = document.createElement("div");
    error.id = this.errorId;
    error.dataset.nativeFormError = "true";
    error.setAttribute("data-for", this.name);
    error.style.color = "red";
    error.style.fontSize = "0.875rem";
    error.style.marginTop = "0.25rem";
    error.setAttribute("aria-live", "polite");

    this.element.insertAdjacentElement("afterend", error);
    this.errorElement = error;
  }

  updateError(message: string | undefined) {
    if (!message) {
      this.removeErrorElement();
      return;
    }

    if (!this.errorElement) {
      this.attachErrorElement();
    }

    this.errorElement!.textContent = message;
  }

  removeErrorElement() {
    this.removeErrorElements(this.findExistingErrorElements());
    this.errorElement = undefined;
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

  markDirty() {
    this.dirty = true;
  }

  mount() {
    this.mounted = true;
  }

  unmount() {
    this.mounted = false;
  }

  // --- New state API (replaces FieldStateStore) ---
  register(initialValue?: NativeFormValue) {
    if (this.mounted) {
      this.initialValue = initialValue;
      this.stateValue = initialValue;
      this.dirty = false;
      this.touched = false;
      this.error = undefined;
      return;
    }

    this.mounted = true;
    this.initialValue = initialValue;
    this.stateValue = initialValue;
    this.dirty = false;
    this.touched = false;
    this.error = undefined;
    this.onChange?.(this.getState());
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
    };
  }

  updateValue(value?: NativeFormValue) {
    const next = value === undefined ? (this.value as NativeFormValue) : value;
    this.stateValue = next;
    this.dirty = !isEqualValue(this.initialValue, next);
    this.onChange?.(this.getState());
  }

  markTouched() {
    this.touched = true;
    this.onChange?.(this.getState());
  }

  setError(message: string | undefined) {
    this.error = message;
    // reflect to DOM validity and inline error label
    try {
      this.element.setCustomValidity(message ?? "");
    } catch (_e) {
      // some elements may not support setCustomValidity in tests
    }

    this.updateError(message);
    this.onChange?.(this.getState());
  }

  reset(value: NativeFormValue | undefined) {
    this.initialValue = value;
    this.stateValue = value;
    this.dirty = false;
    this.touched = false;
    this.error = undefined;
    this.onChange?.(this.getState());
  }
  // --- Lifecycle helpers ---
  // Called when the browser emits input on the control
  handleInput() {
    this.updateValue();
  }

  // Called when the browser emits change on the control
  handleChange() {
    this.updateValue();
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
    try {
      this.element.setCustomValidity("");
    } catch (_e) {}
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
