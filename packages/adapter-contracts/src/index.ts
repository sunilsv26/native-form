import { describe, it, expect } from "vitest";
import type { Validator } from "@native-form/core";

export type AdapterFixtures = {
  goodNestedResolver: Validator;
  goodArrayResolver: Validator;
  badArrayResolver: Validator;
  nestedArrayResolver: Validator;
  optionalResolver: Validator;
  unionResolver: Validator;
  nullableResolver: Validator;
  discriminatedResolver: Validator;
  tupleResolver: Validator;
};

export function adapterContractSuite(label: string, fixtures: AdapterFixtures) {
  describe(`${label} adapter contract`, () => {
    it("maps dotted field names to nested object paths", async () => {
      const result = await fixtures.goodNestedResolver.validate(
        { "user.email": "user@example.com" },
        {} as never,
      );

      expect(result).toEqual({
        success: true,
        values: {
          user: {
            email: "user@example.com",
          },
        },
      });
    });

    it("maps dotted index segments to arrays", async () => {
      const result = await fixtures.goodArrayResolver.validate(
        {
          "users.0.email": "first@example.com",
          "users.1.email": "second@example.com",
        },
        {} as never,
      );

      expect(result).toEqual({
        success: true,
        values: {
          users: [
            { email: "first@example.com" },
            { email: "second@example.com" },
          ],
        },
      });
    });

    it("keeps error paths aligned to dotted field names", async () => {
      const result = await fixtures.badArrayResolver.validate(
        {
          "users.0.email": "not-an-email",
        },
        {} as never,
      );

      expect(result).toEqual({
        success: false,
        issues: [
          {
            name: "users.0.email",
            message: expect.any(String),
          },
        ],
      });
    });

    it("handles nested arrays (arrays of arrays) and keeps structure", async () => {
      const result = await fixtures.nestedArrayResolver.validate(
        {
          "groups.0.0.email": "one@example.com",
          "groups.0.1.email": "two@example.com",
          "groups.1.0.email": "three@example.com",
        },
        {} as never,
      );

      expect(result).toEqual({
        success: true,
        values: {
          groups: [
            [{ email: "one@example.com" }, { email: "two@example.com" }],
            [{ email: "three@example.com" }],
          ],
        },
      });
    });

    it("accepts missing optional fields as valid", async () => {
      const result = await fixtures.optionalResolver.validate({}, {} as never);

      // Require deterministic parity: optional fields should be omitted
      // from the resulting values (empty object expected).
      expect(result).toEqual({ success: true, values: {} });
    });

    it("supports union types: string or nested object", async () => {
      // case: plain string
      const r1 = await fixtures.unionResolver.validate(
        { item: "plain-string" },
        {} as never,
      );

      expect(r1).toEqual({
        success: true,
        values: { item: "plain-string" },
      });

      // case: nested object branch
      const r2 = await fixtures.unionResolver.validate(
        { "item.email": "union@example.com" },
        {} as never,
      );

      expect(r2).toEqual({
        success: true,
        values: { item: { email: "union@example.com" } },
      });
    });

    it("accepts null and missing for nullable/optional fields", async () => {
      const r1 = await fixtures.nullableResolver.validate({}, {} as never);
      expect(r1.success).toBe(true);

      const r2 = await fixtures.nullableResolver.validate(
        { maybe: null },
        {} as never,
      );
      expect(r2.success).toBe(true);
    });

    it("handles discriminated unions via a type field", async () => {
      const r1 = await fixtures.discriminatedResolver.validate(
        { "entry.type": "a", "entry.a": "value-a" },
        {} as never,
      );
      expect(r1).toEqual({
        success: true,
        values: { entry: { type: "a", a: "value-a" } },
      });

      const r2 = await fixtures.discriminatedResolver.validate(
        { "entry.type": "b", "entry.b": "42" },
        {} as never,
      );
      expect(r2.success).toBe(true);
    });

    it("supports tuple shapes (fixed-length arrays)", async () => {
      const res = await fixtures.tupleResolver.validate(
        { "tuple.0": "first", "tuple.1": "2" },
        {} as never,
      );

      expect(res).toEqual({ success: true, values: { tuple: ["first", "2"] } });
    });
  });
}
