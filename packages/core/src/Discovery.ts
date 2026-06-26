import { FieldNode } from "./FieldNode";
import { FieldRegistry } from "./FieldRegistry";

export class Discovery {
  discover(form: HTMLFormElement, registry: FieldRegistry): void {
    registry.clear();

    for (const control of Array.from(form.elements)) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        if (!control.name) {
          continue;
        }

        registry.register(new FieldNode(control));
      }
    }
  }
}
