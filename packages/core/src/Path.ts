/** @public */
export type FieldPathSegment = string | number;

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
