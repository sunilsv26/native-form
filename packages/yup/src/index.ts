import { NativeFormValues, Validator } from "@native-form/core";
import type { AnySchema, ValidationError } from "yup";

export function yupResolver<TSchema extends AnySchema>(
  schema: TSchema,
): Validator<unknown & NativeFormValues> {
  return {
    async validate(values) {
      try {
        const result = await schema.validate(toNestedValues(values), {
          abortEarly: false,
        });

        return {
          success: true,
          values: result as unknown & NativeFormValues,
        };
      } catch (err) {
        const error = err as ValidationError;

        const issues = (
          error.inner && error.inner.length > 0 ? error.inner : [error]
        )
          .filter(Boolean)
          .map((issue) => {
            const rawPath = String(issue.path || "");
            // Normalize bracket notation (users[0].email) to dotted numeric segments (users.0.email)
            const name = rawPath.replace(/\[(\d+)\]/g, ".$1");

            return {
              name,
              message: String(issue.message || "validation failed"),
            };
          });

        return {
          success: false,
          issues,
        };
      }
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
        (current as unknown[])[index] = value;
        return;
      }

      const existing = (current as unknown[])[index];

      if (!isContainer(existing)) {
        (current as unknown[])[index] = nextIsIndex ? [] : {};
      }

      current = (current as unknown[])[index];
      continue;
    }

    if (!isObjectRecord(current)) {
      return;
    }

    if (isLast) {
      (current as Record<string, unknown>)[part] = value;
      return;
    }

    const existing = (current as Record<string, unknown>)[part];

    if (!isContainer(existing)) {
      (current as Record<string, unknown>)[part] = nextIsIndex ? [] : {};
    }

    current = (current as Record<string, unknown>)[part];
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
