import { NativeFormElement } from "./types";

export class FieldNode {
  private static nextErrorId = 0;

  private readonly errorId = `native-form-error-${FieldNode.nextErrorId++}`;

  private errorElement?: HTMLElement;

  constructor(public readonly element: NativeFormElement) {}
  private dirty = false;

  private touched = false;

  private mounted = true;

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

  markTouched() {
    this.touched = true;
  }

  mount() {
    this.mounted = true;
  }

  unmount() {
    this.mounted = false;
  }
}
