/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { FieldErrorRenderer } from "../src/FieldErrorRenderer";
import { FieldNode } from "../src/FieldNode";

describe("FieldErrorRenderer", () => {
  it("renders and clears inline error labels and custom validity", () => {
    const input = document.createElement("input");
    input.name = "email";
    document.body.append(input);

    const field = new FieldNode(input);
    const renderer = new FieldErrorRenderer();

    renderer.applyErrors([field], { email: "Email is required" });

    expect(input.validationMessage).toBe("Email is required");
    expect(
      input.nextElementSibling?.getAttribute("data-native-form-error"),
    ).toBe("true");
    expect(input.nextElementSibling?.textContent).toBe("Email is required");

    renderer.applyErrors([field], {});

    expect(input.validationMessage).toBe("");
    expect(
      document.querySelectorAll('div[data-native-form-error="true"]').length,
    ).toBe(0);

    input.remove();
  });

  it("normalizes duplicate contiguous error labels", () => {
    const input = document.createElement("input");
    input.name = "email";
    document.body.append(input);

    const staleA = document.createElement("div");
    staleA.dataset.nativeFormError = "true";
    staleA.textContent = "A";
    input.insertAdjacentElement("afterend", staleA);

    const staleB = document.createElement("div");
    staleB.dataset.nativeFormError = "true";
    staleB.textContent = "B";
    staleA.insertAdjacentElement("afterend", staleB);

    const field = new FieldNode(input);
    const renderer = new FieldErrorRenderer();

    renderer.normalizeFields([field]);

    expect(
      document.querySelectorAll('div[data-native-form-error="true"]').length,
    ).toBe(1);

    input.remove();
  });
});
