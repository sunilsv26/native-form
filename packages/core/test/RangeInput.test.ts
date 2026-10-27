/* @vitest-environment jsdom */

import { describe, it, expect } from "vitest";
import { FieldNode } from "../src/field/FieldNode";
import { Serializer } from "../src/serialization/Serializer";
import { Runtime } from "../src/runtime/Runtime";

describe("Range Input (<input type=\"range\">)", () => {
  it("extracts typed number from range input in FieldNode", () => {
    const input = document.createElement("input");
    input.type = "range";
    input.name = "allowance";
    input.min = "0";
    input.max = "100";
    input.value = "75";

    const node = new FieldNode(input);
    expect(node.value).toBe(75);
    expect(typeof node.value).toBe("number");
  });

  it("serializes range input as number in typed serialization", () => {
    const input = document.createElement("input");
    input.type = "range";
    input.name = "allowance";
    input.min = "0";
    input.max = "100";
    input.value = "42";

    const serializer = new Serializer();
    const node = new FieldNode(input);
    const values = serializer.serializeFields([node]);
    expect(values).toEqual({ allowance: 42 });
    expect(typeof values.allowance).toBe("number");
  });

  it("validates range input successfully against number validator", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "range";
    input.name = "allowance";
    input.value = "50";
    form.appendChild(input);

    let receivedAllowance: unknown;
    const runtime = new Runtime<{ allowance: number }>({
      serializationMode: "typed",
      validator: {
        validate: (values) => {
          receivedAllowance = values.allowance;
          if (typeof values.allowance !== "number" || values.allowance < 10) {
            return {
              success: false,
              issues: [{ name: "allowance", message: "Allowance must be at least 10" }],
            };
          }
          return { success: true, data: values as { allowance: number } };
        },
      },
    });

    runtime.mount(form);
    const result = await runtime.submit();
    expect(receivedAllowance).toBe(50);
    expect(typeof receivedAllowance).toBe("number");
    expect(result.success).toBe(true);

    runtime.unmount();
  });
});
