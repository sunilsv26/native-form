import { NativeFormValues, toNestedValues, Validator } from "@native-form/core";
import type { AnySchema, ValidationError } from "yup";

/** @public */
export function yupResolver<TSchema extends AnySchema>(
  schema: TSchema,
): Validator<unknown & NativeFormValues> {
  return {
    async validate(values) {
      try {
        const result = await schema.validate(toNestedValues(values), {
          abortEarly: false,
        });

        const normalized = normalizeValues(result);

        return {
          success: true,
          values: (normalized === undefined ? {} : normalized) as unknown &
            NativeFormValues,
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
