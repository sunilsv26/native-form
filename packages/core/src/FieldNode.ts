import { NativeFormElement } from "./types";

export class FieldNode {
  constructor(public readonly element: NativeFormElement) {}

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
}
