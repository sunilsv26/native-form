import { describe, expect, it } from "vitest";
import * as v from "valibot";

import { valibotResolver } from "../src/index";

describe("valibotResolver", () => {
  it("maps dotted field names to nested object paths", async () => {
    const schema = v.object({
      user: v.object({
        email: v.pipe(v.string(), v.email()),
      }),
    });
    const resolver = valibotResolver(schema);

    const result = await resolver.validate(
      {
        "user.email": "user@example.com",
      },
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
    const schema = v.object({
      users: v.array(
        v.object({
          email: v.pipe(v.string(), v.email()),
        }),
      ),
    });
    const resolver = valibotResolver(schema);

    const result = await resolver.validate(
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
    const schema = v.object({
      users: v.array(
        v.object({
          email: v.pipe(v.string(), v.email("Invalid email")),
        }),
      ),
    });
    const resolver = valibotResolver(schema);

    const result = await resolver.validate(
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
          message: "Invalid email",
        },
      ],
    });
  });

  it("supports asynchronous schemas and check validations", async () => {
    const schema = v.objectAsync({
      username: v.pipeAsync(
        v.string(),
        v.checkAsync(async (input) => {
          await new Promise((r) => setTimeout(r, 10));
          return input !== "taken";
        }, "Username is already taken"),
      ),
    });
    const resolver = valibotResolver(schema);

    const validResult = await resolver.validate(
      { username: "available" },
      {} as never,
    );
    expect(validResult).toEqual({
      success: true,
      values: { username: "available" },
    });

    const invalidResult = await resolver.validate(
      { username: "taken" },
      {} as never,
    );
    expect(invalidResult).toEqual({
      success: false,
      issues: [
        {
          name: "username",
          message: "Username is already taken",
        },
      ],
    });
  });
});

