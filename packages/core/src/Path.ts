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

/** @public */
export function splitPath(path: string): string[] {
  return path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
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
