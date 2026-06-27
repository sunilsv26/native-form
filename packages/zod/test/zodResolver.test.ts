import { describe, expect, it } from "vitest";
import { z } from "zod";

import { zodResolver } from "../src/index";

describe("zodResolver", () => {
  it("maps dotted field names to nested object paths", async () => {
    const schema = z.object({
      user: z.object({
        email: z.string().email(),
      }),
    });
    const resolver = zodResolver(schema);

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
    const schema = z.object({
      users: z.array(
        z.object({
          email: z.string().email(),
        }),
      ),
    });
    const resolver = zodResolver(schema);

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
    const schema = z.object({
      users: z.array(
        z.object({
          email: z.string().email("Invalid email"),
        }),
      ),
    });
    const resolver = zodResolver(schema);

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
});
