import { FieldNode } from "./FieldNode";
import { FieldRegistry } from "./FieldRegistry";

export class Discovery {
  discover(form: HTMLFormElement, registry: FieldRegistry): void {
    // Register controls found in the form. If a control with the same
    // name already exists in the registry, reuse it when it's the same
    // DOM element; otherwise replace the entry so the registry always
    // reflects the current DOM node for that name.

    const seen = new Set<string>();

    for (const control of Array.from(form.elements)) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        if (!control.name) {
          continue;
        }

        const name = control.name;
        seen.add(name);

        if (registry.has(name)) {
          const existing = registry.get(name)!;

          // If the registry already has the same DOM element, keep it.
          if (existing.element === control) {
            continue;
          }

          // Otherwise replace the registry entry so the FieldNode points
          // to the current DOM control.
          registry.unregister(name);
          registry.register(new FieldNode(control));
          continue;
        }

        registry.register(new FieldNode(control));
      }
    }

    // Unregister any fields that were removed from the DOM since the
    // previous discovery pass.
    for (const field of registry.getAll()) {
      if (!seen.has(field.name)) {
        registry.unregister(field.name);
      }
    }
  }
}
