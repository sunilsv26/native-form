import {
  NativeFormValues,
  ValidationContext,
  Validator,
} from "@native-form/core";
import { z } from "zod";

export function zodResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): Validator<z.output<TSchema> & NativeFormValues> {
  return {
    async validate(values, context) {
      const result = await schema.safeParseAsync(toNestedValues(values));

      if (!result.success) {
        return {
          success: false,
          issues: result.error.issues.map((issue) => ({
            name: issue.path.map(String).join("."),
            message: issue.message,
          })),
        };
      }

      return {
        success: true,
        values: result.data as z.output<TSchema> & NativeFormValues,
      };
    },
  };
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
