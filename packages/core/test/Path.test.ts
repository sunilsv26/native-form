import { describe, expect, it } from "vitest";

import { arrayItemPath, formPath } from "../src/Path";

describe("Path helpers", () => {
  it("builds dotted paths from string and number segments", () => {
    expect(formPath("user", "email")).toBe("user.email");
    expect(formPath("users", 0, "email")).toBe("users.0.email");
  });

  it("filters empty segments while preserving valid path parts", () => {
    expect(formPath(" user ", "", "email")).toBe("user.email");
  });

  it("builds indexed array item paths", () => {
    expect(arrayItemPath("users", 0, "email")).toBe("users.0.email");
    expect(arrayItemPath("roles", 2)).toBe("roles.2");
  });

  it("throws on invalid array indexes", () => {
    expect(() => arrayItemPath("users", -1, "email")).toThrow(
      "arrayItemPath index must be a non-negative integer.",
    );
    expect(() => arrayItemPath("users", 1.5, "email")).toThrow(
      "arrayItemPath index must be a non-negative integer.",
    );
  });
});
