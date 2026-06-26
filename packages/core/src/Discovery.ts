import { FieldInfo, NativeFormElement } from "./types";

export class Discovery {
  discover(form: HTMLFormElement): FieldInfo[] {
    const fields: FieldInfo[] = [];

    const controls = Array.from(form.elements);

    for (const control of controls) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        if (!control.name) continue;

        fields.push({
          name: control.name,
          type: this.getType(control),
          tag: control.tagName,
          element: control,
        });
      }
    }

    return fields;
  }

  private getType(element: NativeFormElement): string {
    if (element instanceof HTMLInputElement) {
      return element.type;
    }

    if (element instanceof HTMLSelectElement) {
      return element.multiple ? "select-multiple" : "select";
    }

    return "textarea";
  }
}
