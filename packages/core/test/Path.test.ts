import { describe, expect, it } from "vitest";

import {
  arrayItemPath,
  formPath,
  getByPath,
  isArrayItemPath,
  matchArrayItemPath,
  normalizePath,
  parseArrayItemPath,
  remapArrayItemIndex,
  setByPath,
  shiftArrayItemIndex,
  splitPath,
  toNestedValues,
} from "../src/Path";

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

  it("splits dotted paths cleanly", () => {
    expect(splitPath("users.0.email")).toEqual(["users", "0", "email"]);
    expect(splitPath("  items . 1 . name  ")).toEqual(["items", "1", "name"]);
    expect(splitPath("")).toEqual([]);
  });

  it("parses array item paths", () => {
    expect(parseArrayItemPath("items.0.name")).toEqual({
      arrayName: "items",
      index: 0,
      subPath: "name",
    });

    expect(parseArrayItemPath("items.3")).toEqual({
      arrayName: "items",
      index: 3,
      subPath: "",
    });

    expect(parseArrayItemPath("org.members.2.role.title")).toEqual({
      arrayName: "org.members",
      index: 2,
      subPath: "role.title",
    });

    expect(parseArrayItemPath("user.email")).toBeNull();
    expect(parseArrayItemPath("items")).toBeNull();
  });

  it("identifies array item paths with isArrayItemPath", () => {
    expect(isArrayItemPath("items.0.name")).toBe(true);
    expect(isArrayItemPath("items.0.name", "items")).toBe(true);
    expect(isArrayItemPath("items.0.name", "users")).toBe(false);
    expect(isArrayItemPath("user.email")).toBe(false);
    expect(isArrayItemPath("email")).toBe(false);
  });

  it("matches array item paths with matchArrayItemPath", () => {
    expect(matchArrayItemPath("items.2.name", "items")).toEqual({
      index: 2,
      subPath: "name",
    });
    expect(matchArrayItemPath("items.2.name", "users")).toBeNull();
    expect(matchArrayItemPath("user.email", "user")).toBeNull();
  });

  it("shifts array item indexes on deletion or insertion", () => {
    // When item at index 1 is removed, item at index 2 shifts to index 1
    expect(shiftArrayItemIndex("items.2.name", "items", 1, -1)).toBe(
      "items.1.name",
    );
    expect(shiftArrayItemIndex("items.3", "items", 1, -1)).toBe("items.2");

    // Item before fromIndex remains untouched
    expect(shiftArrayItemIndex("items.0.name", "items", 1, -1)).toBe(
      "items.0.name",
    );

    // Unrelated paths remain untouched
    expect(shiftArrayItemIndex("users.2.name", "items", 1, -1)).toBe(
      "users.2.name",
    );
    expect(shiftArrayItemIndex("items.nonIndex.name", "items", 1, -1)).toBe(
      "items.nonIndex.name",
    );

    // When item is inserted at index 1, item at index 1 shifts to index 2
    expect(shiftArrayItemIndex("items.1.name", "items", 1, 1)).toBe(
      "items.2.name",
    );
  });

  it("throws when shiftArrayItemIndex results in negative index", () => {
    expect(() => shiftArrayItemIndex("items.0.name", "items", 0, -1)).toThrow(
      "shiftArrayItemIndex resulted in a negative index.",
    );
  });

  it("remaps array item indexes with remapArrayItemIndex", () => {
    expect(remapArrayItemIndex("items.0.name", "items", 0, 3)).toBe(
      "items.3.name",
    );
    expect(remapArrayItemIndex("items.0", "items", 0, 2)).toBe("items.2");

    // Mismatched index or arrayName remains unchanged
    expect(remapArrayItemIndex("items.1.name", "items", 0, 3)).toBe(
      "items.1.name",
    );
    expect(remapArrayItemIndex("other.0.name", "items", 0, 3)).toBe(
      "other.0.name",
    );
  });

  it("throws on invalid newIndex for remapArrayItemIndex", () => {
    expect(() => remapArrayItemIndex("items.0.name", "items", 0, -1)).toThrow(
      "remapArrayItemIndex newIndex must be a non-negative integer.",
    );
    expect(() => remapArrayItemIndex("items.0.name", "items", 0, 1.5)).toThrow(
      "remapArrayItemIndex newIndex must be a non-negative integer.",
    );
  });

  describe("Bracket notation & normalization (RFC 003)", () => {
    it("splits bracket notation paths into clean segments", () => {
      expect(splitPath("user[profile][name]")).toEqual([
        "user",
        "profile",
        "name",
      ]);
      expect(splitPath("items[0].title")).toEqual(["items", "0", "title"]);
      expect(splitPath("items[0][title]")).toEqual(["items", "0", "title"]);
      expect(splitPath("data['nested'][\"key\"]")).toEqual(["data", "nested", "key"]);
    });

    it("normalizes bracket paths to canonical dot notation", () => {
      expect(normalizePath("user[profile][name]")).toBe("user.profile.name");
      expect(normalizePath("tasks[0].title")).toBe("tasks.0.title");
      expect(normalizePath("tasks[0][title]")).toBe("tasks.0.title");
      expect(normalizePath("user.name")).toBe("user.name");
      expect(normalizePath("")).toBe("");
    });
  });

  describe("getByPath (RFC 003)", () => {
    const data = {
      user: {
        profile: {
          name: "Alice",
        },
      },
      tags: ["frontend", "react"],
      matrix: [[1, 2], [3, 4]],
    };

    it("reads deeply nested values with dot and bracket paths", () => {
      expect(getByPath(data, "user.profile.name")).toBe("Alice");
      expect(getByPath(data, "user[profile][name]")).toBe("Alice");
      expect(getByPath(data, "tags.0")).toBe("frontend");
      expect(getByPath(data, "tags[1]")).toBe("react");
      expect(getByPath(data, "matrix.1.0")).toBe(3);
    });

    it("returns default fallback for missing paths", () => {
      expect(getByPath(data, "user.profile.missing", "fallback")).toBe("fallback");
      expect(getByPath(data, "nonexistent.field")).toBeUndefined();
    });

    it("blocks prototype pollution read attempts", () => {
      expect(getByPath(data, "__proto__")).toBeUndefined();
      expect(getByPath(data, "constructor.prototype")).toBeUndefined();
    });
  });

  describe("setByPath (RFC 003)", () => {
    it("creates nested objects and sets deep values", () => {
      const target: Record<string, unknown> = {};
      setByPath(target, "user.profile.name", "Alice");
      expect(target).toEqual({
        user: {
          profile: {
            name: "Alice",
          },
        },
      });
    });

    it("creates arrays for numeric segments", () => {
      const target: Record<string, unknown> = {};
      setByPath(target, "tasks[0].title", "Task 1");
      setByPath(target, "tasks[1].title", "Task 2");
      expect(target).toEqual({
        tasks: [{ title: "Task 1" }, { title: "Task 2" }],
      });
    });

    it("handles mixed dot and bracket notation paths", () => {
      const target: Record<string, unknown> = {};
      setByPath(target, "company[departments].0.manager[name]", "Elena");
      expect(target).toEqual({
        company: {
          departments: [
            {
              manager: {
                name: "Elena",
              },
            },
          ],
        },
      });
    });

    it("strictly prevents prototype pollution attacks", () => {
      const target: Record<string, unknown> = {};

      setByPath(target, "__proto__.polluted", "hacked");
      setByPath(target, "constructor.prototype.polluted", "hacked");
      setByPath(target, "prototype.polluted", "hacked");

      expect((target as any).polluted).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });
  });

  describe("toNestedValues (RFC 003)", () => {
    it("converts a flat key-value map into deeply nested structures", () => {
      const flat = {
        "user.name": "Alice",
        "user.age": 28,
        "user[address][city]": "Wonderland",
        "tasks[0].title": "Read RFC",
        "tasks[0].completed": true,
        "tasks[1].title": "Implement NF-013",
        "tasks[1].completed": false,
      };

      const nested = toNestedValues(flat);

      expect(nested).toEqual({
        user: {
          name: "Alice",
          age: 28,
          address: {
            city: "Wonderland",
          },
        },
        tasks: [
          {
            title: "Read RFC",
            completed: true,
          },
          {
            title: "Implement NF-013",
            completed: false,
          },
        ],
      });
    });

    it("safely handles prototype pollution in flat input maps", () => {
      const malicious = {
        "__proto__.isAdmin": true,
        "user.profile.name": "Eve",
        "constructor.prototype.isRoot": true,
      };

      const nested = toNestedValues(malicious);

      expect(nested).toEqual({
        user: {
          profile: {
            name: "Eve",
          },
        },
      });

      expect(({} as any).isAdmin).toBeUndefined();
      expect(({} as any).isRoot).toBeUndefined();
    });
  });
});
