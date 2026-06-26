import { NativeFormElement } from "./types";

export class FieldNode {
  readonly name: string;
  readonly element: NativeFormElement;

  touched = false;
  dirty = false;

  constructor(element: NativeFormElement) {
    this.element = element;
    this.name = element.name;
  }

  get tag() {
    return this.element.tagName;
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
            : Number(this.element.value);

        case "file":
          return this.element.files;

        default:
          return this.element.value;
      }
    }

    if (this.element instanceof HTMLSelectElement) {
      if (this.element.multiple) {
        return Array.from(this.element.selectedOptions).map(
          (option) => option.value,
        );
      }

      return this.element.value;
    }

    return this.element.value;
  }

  focus() {
    this.element.focus();
  }

  blur() {
    this.element.blur();
  }

  reset() {
    if (this.element instanceof HTMLInputElement) {
      switch (this.element.type) {
        case "checkbox":
          this.element.checked = false;
          break;

        default:
          this.element.value = "";
      }

      return;
    }

    this.element.value = "";
  }
}
