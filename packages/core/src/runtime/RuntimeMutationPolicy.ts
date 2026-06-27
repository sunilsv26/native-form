export const runtimeMutationObserverOptions: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["name", "disabled"],
};

export function isRuntimeMutationRelevant(mutation: MutationRecord): boolean {
  if (mutation.type === "attributes") {
    return isNativeFormControl(mutation.target as Node);
  }

  if (mutation.type === "childList") {
    const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

    return nodes.some((node) => {
      if (isErrorLabel(node)) {
        return false;
      }

      return isNativeFormControl(node) || containsNativeFormControl(node);
    });
  }

  return false;
}

function isNativeFormControl(node: Node): boolean {
  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  );
}

function containsNativeFormControl(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    Boolean(node.querySelector("input[name], select[name], textarea[name]"))
  );
}

function isErrorLabel(node: Node): boolean {
  return node instanceof HTMLElement && node.dataset.nativeFormError === "true";
}
