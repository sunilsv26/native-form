/* @vitest-environment jsdom */

import { describe, it, expect, vi } from "vitest";

import { FieldNode } from "../src/FieldNode";

describe("FieldNode", () => {
  it("owns state and emits onChange on register", () => {
    const input = document.createElement("input");
    input.name = "email";
    input.value = "a@example.com";

    const node = new FieldNode(input);
    const cb = vi.fn();
    node.onChange = cb;

    node.register("a@example.com");

    expect(cb).toHaveBeenCalled();
    const state = cb.mock.calls[cb.mock.calls.length - 1][0];
    expect(state).toMatchObject({
      name: "email",
      mounted: true,
      value: "a@example.com",
      dirty: false,
    });
  });

  it("updateValue reads DOM and marks dirty, emitting onChange", () => {
    const input = document.createElement("input");
    input.name = "email";
    input.value = "initial@example.com";

    const node = new FieldNode(input);
    const cb = vi.fn();
    node.onChange = cb;

    node.register("initial@example.com");

    // change DOM value
    input.value = "changed@example.com";
    node.updateValue();

    expect(cb).toHaveBeenCalled();
    const state = node.getState();
    expect(state.value).toBe("changed@example.com");
    expect(state.dirty).toBe(true);
  });

  it("setError updates state and emits onChange", () => {
    const input = document.createElement("input");
    input.name = "email";

    const node = new FieldNode(input);
    const cb = vi.fn();
    node.onChange = cb;

    node.register(undefined);
    node.setError("Invalid email");

    const state = node.getState();
    expect(state.error).toBe("Invalid email");
    expect(cb).toHaveBeenCalled();
  });

  it("reset restores initial value and emits onChange", () => {
    const input = document.createElement("input");
    input.name = "email";
    input.value = "first@example.com";

    const node = new FieldNode(input);
    const cb = vi.fn();
    node.onChange = cb;

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
});
