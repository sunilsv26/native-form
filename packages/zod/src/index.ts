import { NativeFormValues, toNestedValues, Validator } from "@native-form/core";
import { z } from "zod";

/** @public */
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

      const normalized = normalizeValues(result.data);

      return {
        success: true,
        values: (normalized === undefined
          ? {}
          : normalized) as z.output<TSchema> & NativeFormValues,
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
