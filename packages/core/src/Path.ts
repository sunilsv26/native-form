export type FieldPathSegment = string | number;

export function formPath(...segments: FieldPathSegment[]): string {
  return segments
    .map((segment) => String(segment).trim())
    .filter(Boolean)
    .join(".");
}

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
