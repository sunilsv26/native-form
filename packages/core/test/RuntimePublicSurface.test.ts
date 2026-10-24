import { describe, expect, it } from "vitest";

import type { Runtime, RuntimePublicApi } from "../src/Runtime";

type RuntimePublicKey =
  | "fields"
  | "mount"
  | "unmount"
  | "serialize"
  | "validate"
  | "submit"
  | "subscribe"
  | "unsubscribe"
  | "getFieldValue"
  | "getFieldState"
  | "getFieldStates"
  | "getFormState"
  | "setOptions";

type RuntimeInstanceKeys = keyof Runtime;
type RuntimeApiKeys = keyof RuntimePublicApi;

type HasOnlyKnownRuntimeKeys =
  Exclude<RuntimeInstanceKeys, RuntimePublicKey> extends never ? true : false;
type HasAllKnownRuntimeKeys =
  Exclude<RuntimePublicKey, RuntimeInstanceKeys> extends never ? true : false;

type HasOnlyKnownApiKeys =
  Exclude<RuntimeApiKeys, RuntimePublicKey> extends never ? true : false;
type HasAllKnownApiKeys =
  Exclude<RuntimePublicKey, RuntimeApiKeys> extends never ? true : false;

const runtimeHasOnlyKnownKeys: HasOnlyKnownRuntimeKeys = true;
const runtimeHasAllKnownKeys: HasAllKnownRuntimeKeys = true;
const apiHasOnlyKnownKeys: HasOnlyKnownApiKeys = true;
const apiHasAllKnownKeys: HasAllKnownApiKeys = true;

describe("Runtime public surface type contract", () => {
  it("keeps Runtime and RuntimePublicApi keys frozen", () => {
    expect(runtimeHasOnlyKnownKeys).toBe(true);
    expect(runtimeHasAllKnownKeys).toBe(true);
    expect(apiHasOnlyKnownKeys).toBe(true);
    expect(apiHasAllKnownKeys).toBe(true);
  });
});
