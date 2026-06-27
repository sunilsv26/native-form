/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { isRuntimeMutationRelevant } from "../src/RuntimeMutationPolicy";

describe("RuntimeMutationPolicy", () => {
  it("treats name or disabled attribute mutations on native controls as relevant", () => {
    const input = document.createElement("input");
    input.name = "email";

    const mutation = {
      type: "attributes",
      target: input,
    } as MutationRecord;

    expect(isRuntimeMutationRelevant(mutation)).toBe(true);
  });

  it("ignores child list mutations that only contain runtime error labels", () => {
    const label = document.createElement("div");
    label.dataset.nativeFormError = "true";

    const mutation = {
      type: "childList",
      target: document.createElement("form"),
      addedNodes: [label],
      removedNodes: [],
    } as unknown as MutationRecord;

    expect(isRuntimeMutationRelevant(mutation)).toBe(false);
  });

  it("treats child list mutations with native controls in subtree as relevant", () => {
    const wrapper = document.createElement("div");
    const nested = document.createElement("input");
    nested.name = "email";
    wrapper.append(nested);

    const mutation = {
      type: "childList",
      target: document.createElement("form"),
      addedNodes: [wrapper],
      removedNodes: [],
    } as unknown as MutationRecord;

    expect(isRuntimeMutationRelevant(mutation)).toBe(true);
  });
});
