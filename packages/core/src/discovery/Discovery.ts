import { FieldNode } from "../field/FieldNode";
import { FieldRegistry } from "../field/FieldRegistry";

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

          // If both are radio buttons in the same radio group, prefer the checked one
          // and avoid thrashing on sibling radios.
          if (
            control instanceof HTMLInputElement &&
            control.type === "radio" &&
            existing.element instanceof HTMLInputElement &&
            existing.element.type === "radio"
          ) {
            if (control.checked && !existing.element.checked) {
              registry.unregister(name);
              registry.register(new FieldNode(control));
            }
            continue;
          }

          // If multiple checkboxes share the same name, retain the registered node
          // if it is still part of the form, rather than thrashing.
          if (
            control instanceof HTMLInputElement &&
            control.type === "checkbox" &&
            existing.element instanceof HTMLInputElement &&
            existing.element.type === "checkbox" &&
            existing.element.form === form
          ) {
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

    // Unregister any fields that were removed from the DOM or whose names changed
    // since the previous discovery pass.
    for (const [key, field] of registry.entries()) {
      if (!seen.has(key) || field.element.name !== key) {
        registry.unregister(key);
      }
    }
  }
}
