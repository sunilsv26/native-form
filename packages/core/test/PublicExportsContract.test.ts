import { describe, expect, it } from "vitest";

type CoreValueExportKey =
  | "Runtime"
  | "arrayItemPath"
  | "createValidationPipeline"
  | "createValidator"
  | "formPath";

type CoreModule = typeof import("../src/index");
type ActualCoreValueKeys = keyof CoreModule;

type HasOnlyKnownCoreExports =
  Exclude<ActualCoreValueKeys, CoreValueExportKey> extends never ? true : false;
type HasAllKnownCoreExports =
  Exclude<CoreValueExportKey, ActualCoreValueKeys> extends never ? true : false;

const hasOnlyKnownCoreExports: HasOnlyKnownCoreExports = true;
const hasAllKnownCoreExports: HasAllKnownCoreExports = true;

describe("@native-form/core public barrel export contract", () => {
  it("keeps value exports frozen", () => {
    expect(hasOnlyKnownCoreExports).toBe(true);
    expect(hasAllKnownCoreExports).toBe(true);
  });
});
