import { describe, it, expect } from "vitest";
import * as core from "../src";

describe("@native-form/core public API", () => {
  it("exports expected symbols", () => {
    expect(core).toBeTruthy();
    expect((core as any).Runtime).toBeDefined();
    expect(typeof (core as any).createValidator).toBe("function");
  });
});
