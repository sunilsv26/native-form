const BLOCKED_PROPERTIES = new Set(["__proto__", "constructor", "prototype"]);

/** @public */
export type FieldPathSegment = string | number;

/** @public */
export interface ArrayItemPathInfo {
  arrayName: string;
  index: number;
  subPath: string;
}

/** @public */
export function formPath(...segments: FieldPathSegment[]): string {
  return segments
    .map((segment) => String(segment).trim())
    .filter(Boolean)
    .join(".");
}

/** @public */
export function arrayItemPath(
  arrayName: string,
  index: number,
  ...segments: FieldPathSegment[]
): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("arrayItemPath index must be a non-negative integer.");
  }

  return formPath(arrayName, index, ...segments);
}

/**
 * Splits any dot or bracket notation path into string segments.
 *
 * @example
 * splitPath("user.name") // ["user", "name"]
 * splitPath("user[profile][name]") // ["user", "profile", "name"]
 * splitPath("items[0].title") // ["items", "0", "title"]
 *
 * @public
 */
export function splitPath(path: string): string[] {
  if (!path) return [];
  return path
    .replace(/\[/g, ".")
    .replace(/\]/g, "")
    .split(".")
    .map((segment) => segment.replace(/['"]/g, "").trim())
    .filter(Boolean);
}

/**
 * Normalizes any dot or bracket notation path into canonical dot notation.
 *
 * @example
 * normalizePath("user[profile][name]") // "user.profile.name"
 * normalizePath("tasks[0].title") // "tasks.0.title"
 *
 * @public
 */
export function normalizePath(path: string): string {
  return splitPath(path).join(".");
}

/** @public */
export function parseArrayItemPath(path: string): ArrayItemPathInfo | null {
  const parts = splitPath(path);

  for (let i = 0; i < parts.length - 1; i++) {
    const next = parts[i + 1];
    if (/^\d+$/.test(next)) {
      const arrayName = parts.slice(0, i + 1).join(".");
      const index = Number(next);
      const subPath = parts.slice(i + 2).join(".");
      return { arrayName, index, subPath };
    }
  }

  return null;
}

/** @public */
export function isArrayItemPath(path: string, arrayName?: string): boolean {
  const parsed = parseArrayItemPath(path);
  if (!parsed) {
    return false;
  }

  if (arrayName !== undefined && parsed.arrayName !== arrayName) {
    return false;
  }

  return true;
}

/** @public */
export function matchArrayItemPath(
  path: string,
  arrayName: string,
): { index: number; subPath: string } | null {
  const parsed = parseArrayItemPath(path);
  if (!parsed || parsed.arrayName !== arrayName) {
    return null;
  }

  return { index: parsed.index, subPath: parsed.subPath };
}

/** @public */
export function shiftArrayItemIndex(
  path: string,
  arrayName: string,
  fromIndex: number,
  delta: number,
): string {
  const parsed = parseArrayItemPath(path);
  if (!parsed || parsed.arrayName !== arrayName || parsed.index < fromIndex) {
    return path;
  }

  const nextIndex = parsed.index + delta;
  if (nextIndex < 0) {
    throw new Error("shiftArrayItemIndex resulted in a negative index.");
  }

  return parsed.subPath
    ? arrayItemPath(arrayName, nextIndex, parsed.subPath)
    : arrayItemPath(arrayName, nextIndex);
}

/** @public */
export function remapArrayItemIndex(
  path: string,
  arrayName: string,
  oldIndex: number,
  newIndex: number,
): string {
  if (!Number.isInteger(newIndex) || newIndex < 0) {
    throw new Error(
      "remapArrayItemIndex newIndex must be a non-negative integer.",
    );
  }

  const parsed = parseArrayItemPath(path);
  if (!parsed || parsed.arrayName !== arrayName || parsed.index !== oldIndex) {
    return path;
  }

  return parsed.subPath
    ? arrayItemPath(arrayName, newIndex, parsed.subPath)
    : arrayItemPath(arrayName, newIndex);
}

/**
 * Safely accesses a value at a nested path inside an object or array.
 *
 * @param target - The root object or array
 * @param path - Dot or bracket path string or segment array
 * @param defaultValue - Optional fallback if the resolved value is undefined
 *
 * @public
 */
export function getByPath(
  target: unknown,
  path: string | readonly string[],
  defaultValue?: unknown,
): unknown {
  const parts = typeof path === "string" ? splitPath(path) : path;

  if (parts.length === 0) {
    return target !== undefined ? target : defaultValue;
  }

  let current: any = target;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return defaultValue;
    }

    if (BLOCKED_PROPERTIES.has(part)) {
      return defaultValue;
    }

    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0) {
        return defaultValue;
      }
      current = current[index];
    } else if (typeof current === "object") {
      current = current[part];
    } else {
      return defaultValue;
    }
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Safely sets a value at a nested path, automatically creating intermediate
 * objects or arrays (for numeric integer segments).
 * Protects against prototype pollution by skipping __proto__, prototype, and constructor.
 *
 * @param target - The root object to modify
 * @param path - Dot or bracket path string or segment array
 * @param value - The value to assign
 *
 * @public
 */
export function setByPath(
  target: Record<string, unknown>,
  path: string | readonly string[],
  value: unknown,
): void {
  const parts = typeof path === "string" ? splitPath(path) : path;

  if (parts.length === 0) {
    return;
  }

  let current: any = target;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (BLOCKED_PROPERTIES.has(part)) {
      return;
    }

    const isLast = i === parts.length - 1;
    const nextPart = parts[i + 1];
    const nextIsIndex = nextPart !== undefined && /^\d+$/.test(nextPart);

    if (Array.isArray(current)) {
      const index = Number(part);

      if (!Number.isInteger(index) || index < 0) {
        return;
      }

      if (isLast) {
        current[index] = value;
        return;
      }

      if (current[index] === undefined || current[index] === null) {
        current[index] = nextIsIndex ? [] : {};
      }

      current = current[index];
      continue;
    }

    if (typeof current === "object" && current !== null) {
      if (isLast) {
        current[part] = value;
        return;
      }

      if (current[part] === undefined || current[part] === null) {
        current[part] = nextIsIndex ? [] : {};
      }

      current = current[part];
      continue;
    }

    return;
  }
}

/**
 * Transforms a flat key-value map into deeply nested objects and arrays.
 *
 * @param flatValues - Flat map of field names to values
 * @returns Deeply nested object/array structure
 *
 * @public
 */
export function toNestedValues<
  TOutput extends Record<string, unknown> = Record<string, unknown>,
>(flatValues: Record<string, unknown>): TOutput {
  const nested: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(flatValues)) {
    const parts = splitPath(path);
    if (parts.length === 0) {
      continue;
    }
    setByPath(nested, parts, value);
  }

  return nested as TOutput;
}
