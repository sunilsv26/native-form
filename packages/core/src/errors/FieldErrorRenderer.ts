import { FieldNode } from "../field/FieldNode";
import { NativeFormElement } from "../shared/types";

export class FieldErrorRenderer {
  private static nextErrorId = 0;

  private readonly errorIds = new WeakMap<NativeFormElement, string>();

  private readonly errorElements = new WeakMap<
    NativeFormElement,
    HTMLElement
  >();

  applyErrors(
    fields: FieldNode[],
    errors: Record<string, string>,
    renderDomErrors: boolean = true,
  ) {
    for (const field of fields) {
      this.applyFieldError(field, errors[field.name], renderDomErrors);
    }
  }

  normalizeFields(fields: FieldNode[]) {
    for (const field of fields) {
      this.normalizeField(field);
    }
  }

  private applyFieldError(
    field: FieldNode,
    message: string | undefined,
    renderDomErrors: boolean = true,
  ) {
    const element = field.element;

    try {
      element.setCustomValidity(message ?? "");
    } catch (_e) {
      // Some controls in tests may not support setCustomValidity.
    }

    if (!renderDomErrors) {
      this.removeErrorElements(this.findExistingErrorElements(element));
      this.errorElements.delete(element);
      return;
    }

    if (!message) {
      this.removeErrorElements(this.findExistingErrorElements(element));
      this.errorElements.delete(element);
      return;
    }

    let errorElement = this.getPrimaryErrorElement(element);

    if (!errorElement) {
      errorElement = this.createErrorElement(field);
      element.insertAdjacentElement("afterend", errorElement);
    }

    errorElement.textContent = message;
    this.errorElements.set(element, errorElement);
  }

  private normalizeField(field: FieldNode) {
    const element = field.element;
    const existing = this.findExistingErrorElements(element);

    if (existing.length === 0) {
      this.errorElements.delete(element);
      return;
    }

    const keep = existing[0];
    this.removeErrorElements(existing.slice(1));
    this.decorateErrorElement(field, keep);
    this.errorElements.set(element, keep);
  }

  private getPrimaryErrorElement(
    element: NativeFormElement,
  ): HTMLElement | undefined {
    const stored = this.errorElements.get(element);

    if (stored?.isConnected) {
      const existing = this.findExistingErrorElements(element);

      if (existing.length > 1) {
        this.removeErrorElements(existing.slice(1));
      }

      return existing[0] ?? stored;
    }

    const existing = this.findExistingErrorElements(element);

    if (existing.length === 0) {
      return undefined;
    }

    const keep = existing[0];
    this.removeErrorElements(existing.slice(1));
    this.errorElements.set(element, keep);
    return keep;
  }

  private findExistingErrorElements(element: NativeFormElement): HTMLElement[] {
    const results: HTMLElement[] = [];
    let node = element.nextElementSibling;

    while (node) {
      if (node instanceof HTMLElement) {
        const id = node.id ?? "";
        const aria = node.getAttribute("aria-live");
        const isRuntimeLabel =
          node.dataset.nativeFormError === "true" ||
          id.startsWith("native-form-error-") ||
          aria === "polite";

        if (isRuntimeLabel) {
          results.push(node);
          node = node.nextElementSibling;
          continue;
        }
      }

      break;
    }

    return results;
  }

  private removeErrorElements(elements: HTMLElement[]) {
    for (const element of elements) {
      element.remove();
    }
  }

  private createErrorElement(field: FieldNode): HTMLElement {
    const error = document.createElement("div");
    this.decorateErrorElement(field, error);
    error.style.color = "red";
    error.style.fontSize = "0.875rem";
    error.style.marginTop = "0.25rem";
    return error;
  }

  private decorateErrorElement(field: FieldNode, element: HTMLElement) {
    element.id = this.getOrCreateErrorId(field.element);
    element.dataset.nativeFormError = "true";
    element.setAttribute("data-for", field.name);
    element.setAttribute("aria-live", "polite");
  }

  private getOrCreateErrorId(element: NativeFormElement): string {
    const existing = this.errorIds.get(element);

    if (existing) {
      return existing;
    }

    const created = `native-form-error-${FieldErrorRenderer.nextErrorId++}`;
    this.errorIds.set(element, created);
    return created;
  }
}
