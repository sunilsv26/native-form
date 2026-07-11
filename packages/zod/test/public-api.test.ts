import { describe, it, expect } from "vitest";
import * as zodPkg from "../src";

describe("@native-form/zod public API", () => {
  it("exports zodResolver", () => {
    expect(zodPkg).toBeTruthy();
    expect(typeof (zodPkg as any).zodResolver).toBe("function");
  });
});
