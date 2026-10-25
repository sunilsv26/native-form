import { describe, it, expect } from "vitest";
import * as reactPkg from "../src";

describe("@native-form/react public API", () => {
  it("exports Form and hooks", () => {
    expect(reactPkg).toBeTruthy();
    expect((reactPkg as any).Form).toBeDefined();
    expect((reactPkg as any).useForm).toBeDefined();
    expect((reactPkg as any).useField).toBeDefined();
    expect((reactPkg as any).useWatch).toBeDefined();
    expect((reactPkg as any).useFieldArray).toBeDefined();
    expect((reactPkg as any).shallowEqual).toBeDefined();
  });
});
