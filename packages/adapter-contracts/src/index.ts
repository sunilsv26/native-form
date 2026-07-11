import { describe, it, expect } from "vitest";
import type { Validator } from "@native-form/core";

export type AdapterFixtures = {
  goodNestedResolver: Validator;
  goodArrayResolver: Validator;
  badArrayResolver: Validator;
  nestedArrayResolver: Validator;
  optionalResolver: Validator;
  unionResolver: Validator;
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

      // Accept any successful validation result — optional fields may be omitted
      // or represented as empty objects depending on schema implementation.
      expect(result.success).toBe(true);
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
  });
}
