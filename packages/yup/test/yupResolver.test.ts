import { describe, it, expect } from "vitest";
import * as yup from "yup";
import { yupResolver } from "../src/index";

describe("yupResolver", () => {
  it("returns issues when validation fails", async () => {
    const schema = yup.object({ foo: yup.string().required() });

    const resolver = yupResolver(schema);

    const result = await resolver.validate({ foo: "" } as any);

    expect(result.success).toBe(false);
    expect(Array.isArray(result.issues)).toBe(true);
    expect(result.issues![0].name).toBe("foo");
  });

  it("returns values when validation succeeds", async () => {
    const schema = yup.object({ foo: yup.string().required() });

    const resolver = yupResolver(schema);

    const result = await resolver.validate({ foo: "bar" } as any);

    expect(result.success).toBe(true);
    expect((result.values as any).foo).toBe("bar");
  });
});
