import { NativeFormValues, Validator } from "@native-form/core";
import {
  type BaseIssue,
  type BaseSchema,
  type BaseSchemaAsync,
  type Config,
  type InferOutput,
  getDotPath,
  safeParseAsync,
} from "valibot";

/** @public */
export type ValibotSchema =
  | BaseSchema<unknown, unknown, BaseIssue<unknown>>
  | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>;

/** @public */
export function valibotResolver<TSchema extends ValibotSchema>(
  schema: TSchema,
  config?: Config<BaseIssue<unknown>>,
): Validator<InferOutput<TSchema> & NativeFormValues> {
  return {
    async validate(values) {
      const result = await safeParseAsync(
        schema,
        toNestedValues(values),
        config,
      );

      if (!result.success) {
        return {
          success: false,
          issues: result.issues.map((issue) => ({
            name: getDotPath(issue) ?? "",
            message: issue.message,
          })),
        };
      }

      const normalized = normalizeValues(result.output);

      return {
        success: true,
        values: (normalized === undefined
          ? {}
          : normalized) as InferOutput<TSchema> & NativeFormValues,
      };
    },
  };
}

function normalizeValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValues);
  }

  if (isObjectRecord(value)) {
    const out: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value)) {
      const nv = normalizeValues(v);
      if (nv !== undefined) {
        out[k] = nv;
      }
    }

    return Object.keys(out).length === 0 ? undefined : out;
  }

  return value;
}

function toNestedValues(values: NativeFormValues): Record<string, unknown> {
  const nested: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(values)) {
    const parts = splitPath(path);

    if (parts.length === 0) {
      continue;
    }

    setByPath(nested, parts, value);
  }

  return nested;
}

function splitPath(path: string): string[] {
  return path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function setByPath(
  target: Record<string, unknown>,
  parts: string[],
  value: unknown,
): void {
  let current: unknown = target;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
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

      const existing = current[index];

      if (!isContainer(existing)) {
        current[index] = nextIsIndex ? [] : {};
      }

      current = current[index];
      continue;
    }

    if (!isObjectRecord(current)) {
      return;
    }

    if (isLast) {
      current[part] = value;
      return;
    }

    const existing = current[part];

    if (!isContainer(existing)) {
      current[part] = nextIsIndex ? [] : {};
    }

    current = current[part];
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isContainer(
  value: unknown,
): value is Record<string, unknown> | unknown[] {
  return isObjectRecord(value) || Array.isArray(value);
}

