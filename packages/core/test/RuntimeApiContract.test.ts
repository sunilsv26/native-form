/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { Runtime } from "../src/Runtime";

describe("Runtime public API contract", () => {
  it("exposes the frozen public methods", () => {
    const runtime = new Runtime();

    expect(typeof runtime.mount).toBe("function");
    expect(typeof runtime.unmount).toBe("function");
    expect(typeof runtime.serialize).toBe("function");
    expect(typeof runtime.serializeFields).toBe("function");
    expect(typeof runtime.validate).toBe("function");
    expect(typeof runtime.submit).toBe("function");
    expect(typeof runtime.subscribe).toBe("function");
    expect(typeof runtime.unsubscribe).toBe("function");
    expect(typeof runtime.getFieldValue).toBe("function");
    expect(typeof runtime.getFieldState).toBe("function");
    expect(typeof runtime.getFieldStates).toBe("function");
    expect(typeof runtime.getFormState).toBe("function");
    expect(typeof runtime.setOptions).toBe("function");
    expect(Array.isArray(runtime.fields)).toBe(true);
  });

  it("returns unsubscribe function from subscribe", () => {
    const runtime = new Runtime();
    const listener = vi.fn();

    const unsubscribe = runtime.subscribe(listener);

    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});
