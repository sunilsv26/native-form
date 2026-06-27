/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { FieldNode } from "../src/FieldNode";
import { FieldRegistry } from "../src/FieldRegistry";

describe("FieldRegistry", () => {
  it("emits mount and unmount events via onChange", () => {
    const input = document.createElement("input");
    input.name = "email";

    const registry = new FieldRegistry();
    const onChange = vi.fn();
    registry.onChange = onChange;

    const node = new FieldNode(input);
    registry.register(node);
    registry.unregister("email");

    expect(onChange).toHaveBeenNthCalledWith(1, {
      type: "mount",
      field: node,
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      type: "unmount",
      field: node,
    });
  });

  it("emits unmount for each field on clear", () => {
    const input1 = document.createElement("input");
    input1.name = "email";
    const input2 = document.createElement("input");
    input2.name = "password";

    const registry = new FieldRegistry();
    const onChange = vi.fn();
    registry.onChange = onChange;

    const email = new FieldNode(input1);
    const password = new FieldNode(input2);

    registry.register(email);
    registry.register(password);
    registry.clear();

    const unmountCalls = onChange.mock.calls.filter(
      ([evt]) => evt.type === "unmount",
    );
    expect(unmountCalls).toHaveLength(2);
  });
});
