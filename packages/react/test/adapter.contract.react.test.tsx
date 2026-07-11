/* @vitest-environment jsdom */

import { describe } from "vitest";
import { adapterContractSuite } from "@native-form/adapter-contracts";

// Minimal helpers to map dotted flat values -> nested structure
function toNested(values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  for (const [path, val] of Object.entries(values)) {
    const parts = path.split(".").filter(Boolean);
    let cur: any = out;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const last = i === parts.length - 1;
      const next = parts[i + 1];
      const nextIsIndex = next !== undefined && /^\d+$/.test(next);

      if (Array.isArray(cur)) {
        const idx = Number(p);
        if (last) cur[idx] = val;
        else {
          cur[idx] = cur[idx] ?? (nextIsIndex ? [] : {});
          cur = cur[idx];
        }
        continue;
      }

      if (last) {
        cur[p] = val;
      } else {
        cur[p] = cur[p] ?? (nextIsIndex ? [] : {});
        cur = cur[p];
      }
    }
  }

  return out;
}

// Minimal validators implementing the Validator interface expected by the suite
const emailCheck = (s: string) => s.includes("@");

function makeSuccessValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      return { success: true as const, values: toNested(values) };
    },
  } as const;
}

function makeArrayValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      return { success: true as const, values: toNested(values) };
    },
  } as const;
}

function makeBadArrayValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      const nested = toNested(values);
      const users: any[] = (nested as any).users ?? [];

      const issues: any[] = [];
      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        if (!u || !emailCheck(String(u.email ?? ""))) {
          issues.push({ name: `users.${i}.email`, message: "Invalid email" });
        }
      }

      if (issues.length) return { success: false as const, issues };
      return { success: true as const, values: nested };
    },
  } as const;
}

function makeNestedArrayValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      return { success: true as const, values: toNested(values) };
    },
  } as const;
}

function makeOptionalValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      // produce an empty object when no values present
      const keys = Object.keys(values);
      if (keys.length === 0) return { success: true as const, values: {} };
      return { success: true as const, values: toNested(values) };
    },
  } as const;
}

function makeUnionValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      if (values.item === null) return { success: true as const, values: {} };
      if (Object.keys(values).some((k) => k.startsWith("item."))) {
        return { success: true as const, values: toNested(values) };
      }
      if (typeof values.item === "string")
        return { success: true as const, values };
      return {
        success: false as const,
        issues: [{ name: "item", message: "Invalid" }],
      };
    },
  } as const;
}

function makeNestedDiscriminatedValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      const nested = toNested(values);
      // support entry.type and branch fields like entry.x.value
      return { success: true as const, values: nested };
    },
  } as const;
}

function makeTupleValidator() {
  return {
    async validate(values: Record<string, unknown>) {
      const nested = toNested(values);
      const tuple = (nested as any).tuple;
      if (!Array.isArray(tuple) || tuple.length !== 2) {
        return {
          success: false as const,
          issues: [{ name: "tuple", message: "Expected tuple" }],
        };
      }
      return { success: true as const, values: nested };
    },
  } as const;
}

describe("react adapter contract (validators-only)", () => {
  adapterContractSuite("react-inline", {
    goodNestedResolver: makeSuccessValidator() as any,
    goodArrayResolver: makeArrayValidator() as any,
    badArrayResolver: makeBadArrayValidator() as any,
    nestedArrayResolver: makeNestedArrayValidator() as any,
    optionalResolver: makeOptionalValidator() as any,
    unionResolver: makeUnionValidator() as any,
    nullableResolver: makeOptionalValidator() as any,
    discriminatedResolver: makeNestedDiscriminatedValidator() as any,
    tupleResolver: makeTupleValidator() as any,
  });
});
