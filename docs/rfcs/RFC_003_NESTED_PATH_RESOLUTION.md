# RFC 003: Nested Object Path Resolution (NF-013 / NF-009)

- **Issue**: [NF-013](file:///d:/workspace/projects/native-form/docs/ISSUE_BACKLOG.md) / [NF-009](file:///d:/workspace/projects/native-form/docs/ISSUE_BACKLOG.md#L223-L242)
- **Status**: Proposed / Decided
- **Target Version**: v0.7.0
- **Author**: Antigravity Core Team

---

## 1. Summary

This RFC specifies the canonical implementation of **Nested Object Path Resolution** in `@native-form/core`.

HTML forms natively present field names as flat string keys (`name="user.profile.name"` or `name="user[profile][name]"`). While native `FormData` returns a flat map of strings, modern JavaScript application logic and schema libraries (Zod, Valibot, Yup) require deeply structured nested objects and indexed arrays:

```ts
// Flat Input Keys
{
  "user.name": "Alice",
  "user.address[city]": "Wonderland",
  "tasks[0].title": "Read RFC",
  "tasks[1].title": "Build Feature"
}

// Deserialized Nested Structure
{
  user: {
    name: "Alice",
    address: { city: "Wonderland" },
  },
  tasks: [
    { title: "Read RFC" },
    { title: "Build Feature" }
  ]
}
```

This RFC defines:
1. Universal path parser supporting **both dot notation (`a.b.c`) and bracket notation (`a[b][c]`, `items[0]`)**.
2. Safe path setters and getters with **prototype-pollution protection** (`__proto__`, `prototype`, `constructor`).
3. Canonical unflattening utility `toNestedValues(flat)` in `@native-form/core`.
4. `Serializer` and `Runtime` integration via `nesting?: 'flat' | 'nested'`.
5. Consolidation of duplicated unflattening code across `@native-form/zod`, `@native-form/valibot`, and `@native-form/yup`.

---

## 2. Motivation & Current Problems

### 2.1 Notation Fragmentation
Different ecosystems and form libraries adhere to distinct conventions:
- **Dot notation** (`user.address.zip`): Popularized by modern frontend schema libraries (Zod, React Hook Form).
- **Bracket notation** (`user[address][zip]`, `items[0][title]`): Standard convention across HTML form specifications, PHP, Rails, Spring, and query string parsers (`qs`).

Until now, `@native-form/core` only split paths on literal dots (`path.split('.')`). Any input utilizing bracket notation remained an opaque, unparsed string key (`"user[address][zip]"`).

### 2.2 Duplicated Adapter Logic
`@native-form/zod`, `@native-form/valibot`, and `@native-form/yup` each implemented their own internal private copy of `toNestedValues` and `setByPath`. These implementations lacked bracket notation parsing and required redundant maintenance.

### 2.3 Prototype Pollution Vulnerability
Naively assigning properties along unverified path segments (e.g., `current[part] = {}`) exposes applications to Prototype Pollution if an input's name contains malicious keys like `__proto__.isAdmin` or `constructor.prototype.polluted`. A centralized, hardened implementation in `@native-form/core` eliminates this attack surface across the entire monorepo.

---

## 3. Detailed Specification

### 3.1 Path Utilities in `@native-form/core/Path`

```ts
/**
 * Normalizes any path expression (bracket or dot notation) into canonical dot notation.
 * @example
 * normalizePath("user[profile][name]") // "user.profile.name"
 * normalizePath("tasks[0].title")      // "tasks.0.title"
 */
export function normalizePath(path: string): string;

/**
 * Splits any path expression into normalized string segments.
 * Supports dot notation (`a.b.c`), bracket notation (`a[b][c]`), and mixed formats.
 * @example
 * splitPath("user[profile].name") // ["user", "profile", "name"]
 * splitPath("items[0]")           // ["items", "0"]
 */
export function splitPath(path: string): string[];

/**
 * Safely accesses a value at a nested path inside an object or array.
 * @param target - Object or array to query
 * @param path - Dot or bracket path string or segment array
 * @param defaultValue - Optional fallback if path does not resolve
 */
export function getByPath(
  target: unknown,
  path: string | readonly string[],
  defaultValue?: unknown,
): unknown;

/**
 * Safely sets a value at a nested path, automatically creating intermediate
 * objects or arrays (for numeric integer segments).
 * Protects against prototype pollution by skipping __proto__, prototype, and constructor.
 */
export function setByPath(
  target: Record<string, unknown>,
  path: string | readonly string[],
  value: unknown,
): void;

/**
 * Transforms a flat key-value map into deeply nested objects and arrays.
 */
export function toNestedValues<TOutput extends Record<string, unknown> = Record<string, unknown>>(
  flatValues: Record<string, unknown>,
): TOutput;
```

### 3.2 Prototype Pollution Security Guarantee

Any path segment matching the following blocked keys is immediately skipped:
- `__proto__`
- `constructor`
- `prototype`

```ts
const BLOCKED_PROPERTIES = new Set(["__proto__", "constructor", "prototype"]);

if (BLOCKED_PROPERTIES.has(segment)) {
  return; // Abort traversal to prevent pollution
}
```

### 3.3 Serializer & Runtime Options

`SerializeFieldsOptions` and `RuntimeOptions` are extended with:

```ts
export interface SerializeFieldsOptions {
  // ... existing options
  /**
   * Output structure format:
   * - 'flat': preserves exact input field names as top-level keys.
   * - 'nested': resolves dot and bracket notation into nested objects/arrays.
   * @defaultValue 'flat'
   */
  nesting?: "flat" | "nested";
}

export interface RuntimeOptions<TValues extends NativeFormValues = NativeFormValues> {
  // ... existing options
  nesting?: "flat" | "nested";
}
```

Defaulting to `'flat'` guarantees 100% backward compatibility for all existing tests and applications.

---

## 4. Implementation Plan

1. **Step 1**: Enhance `splitPath` and implement `normalizePath`, `getByPath`, `setByPath`, and `toNestedValues` in `packages/core/src/Path.ts`.
2. **Step 2**: Add comprehensive unit tests in `packages/core/test/Path.test.ts` covering:
   - Dot notation
   - Bracket notation (`user[address][city]`, `items[0]`, mixed)
   - Prototype pollution attempts
   - Array item index creation and deep objects
3. **Step 3**: Integrate `nesting?: "flat" | "nested"` in `Serializer.ts` and `Runtime.ts`.
4. **Step 4**: Consolidate `@native-form/zod`, `@native-form/valibot`, and `@native-form/yup` to consume core's `toNestedValues`.
5. **Step 5**: Run full monorepo verify and API extractor test suite.

