import { NativeFormValues, toNestedValues, Validator } from "@native-form/core";
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

