import { describe, it, expect } from "vitest";
import type { Validator } from "@native-form/core";

export type AdapterFixtures = {
  goodNestedResolver: Validator;
  goodArrayResolver: Validator;
  badArrayResolver: Validator;
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
  });
}
