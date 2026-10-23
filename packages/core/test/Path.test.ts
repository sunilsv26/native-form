import { describe, expect, it } from "vitest";

import {
  arrayItemPath,
  formPath,
  isArrayItemPath,
  matchArrayItemPath,
  parseArrayItemPath,
  remapArrayItemIndex,
  shiftArrayItemIndex,
  splitPath,
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
});
