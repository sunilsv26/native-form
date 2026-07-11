import { describe, it, expect } from "vitest";
import * as yupPkg from "../src";

describe("@native-form/yup public API", () => {
  it("exports yupResolver", () => {
    expect(yupPkg).toBeTruthy();
    expect(typeof (yupPkg as any).yupResolver).toBe("function");
  });
});
