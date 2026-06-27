/* @vitest-environment jsdom */

import { describe, it, expect } from "vitest";

import { FieldNode } from "../src/FieldNode";

describe("FieldNode", () => {
  it("owns state on register", () => {
    const input = document.createElement("input");
    input.name = "email";
    input.value = "a@example.com";

    const node = new FieldNode(input);

    node.register("a@example.com");

    expect(node.getState()).toMatchObject({
      name: "email",
      mounted: true,
      value: "a@example.com",
      dirty: false,
    });
  });

  it("updateValue reads DOM and marks dirty", () => {
    const input = document.createElement("input");
    input.name = "email";
    input.value = "initial@example.com";

    const node = new FieldNode(input);

    node.register("initial@example.com");

    // change DOM value
    input.value = "changed@example.com";
    node.updateValue();

    const state = node.getState();
    expect(state.value).toBe("changed@example.com");
    expect(state.dirty).toBe(true);
  });

  it("setError updates state", () => {
    const input = document.createElement("input");
    input.name = "email";

    const node = new FieldNode(input);

    node.register(undefined);
    node.setError("Invalid email");

    const state = node.getState();
    expect(state.error).toBe("Invalid email");
  });

  it("reset restores initial value", () => {
    const input = document.createElement("input");
    input.name = "email";
    input.value = "first@example.com";

    const node = new FieldNode(input);

    node.register("first@example.com");

    input.value = "modified@example.com";
    node.updateValue();
    expect(node.getState().dirty).toBe(true);

    node.reset("first@example.com");
    expect(node.getState()).toMatchObject({
      value: "first@example.com",
      dirty: false,
      touched: false,
    });
  });

  it("tracks file input values from the native files property", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.name = "avatar";

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const files = [file] as unknown as FileList;

    Object.defineProperty(input, "files", {
      value: files,
      configurable: true,
    });

    const node = new FieldNode(input);

    node.register(undefined);
    node.updateValue();

    expect(node.getState()).toMatchObject({
      name: "avatar",
      value: files,
      dirty: true,
    });
  });
});
