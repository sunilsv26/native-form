import { describe, it, expect } from "vitest";
import * as valibotPkg from "../src";

describe("@native-form/valibot public API", () => {
  it("exports valibotResolver", () => {
    expect(valibotPkg).toBeTruthy();
    expect(typeof (valibotPkg as any).valibotResolver).toBe("function");
  });
});

