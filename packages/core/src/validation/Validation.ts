import { NativeFormFlatValues, NativeFormValues } from "../shared/types";

/** @public */
export interface ValidationIssue {
  name: string;
  message: string;
}

/** @public */
export interface ValidationContext {
  form: HTMLFormElement;
  signal: AbortSignal;
}

/** @public */
export type ValidationResult<
  TValues extends NativeFormValues = NativeFormValues,
> =
  | {
      success: true;
      values: TValues;
      issues?: never;
    }
  | {
      success: false;
      values?: never;
      issues: ValidationIssue[];
    };

/** @public */
export interface Validator<
  TValues extends NativeFormValues = NativeFormValues,
> {
  validate(
    values: NativeFormValues,
    context?: ValidationContext,
  ): ValidationResult<TValues> | Promise<ValidationResult<TValues>>;
}

/** @public */
export interface StandardSchemaIssue {
  message: string;
  path?: readonly (PropertyKey | { key: PropertyKey })[];
}

/** @public */
export type StandardSchemaResult<TValues> =
  | {
      value: TValues;
      issues?: never;
    }
  | {
      value?: never;
      issues: readonly StandardSchemaIssue[];
    };

/** @public */
export interface StandardSchemaV1<
  TValues extends NativeFormValues = NativeFormValues,
> {
  "~standard": {
    version: 1;
    vendor: string;
    validate(
      value: unknown,
    ): StandardSchemaResult<TValues> | Promise<StandardSchemaResult<TValues>>;
    types?: {
      input: unknown;
      output: TValues;
    };
  };
}

/** @public */
export type SchemaLike<TValues extends NativeFormValues = NativeFormValues> =
  | Validator<TValues>
  | StandardSchemaV1<TValues>;

/** @public */
export type InferSchemaOutput<TSchema> =
  TSchema extends StandardSchemaV1<infer TValues>
    ? TValues
    : TSchema extends Validator<infer TValues>
      ? TValues
      : NativeFormValues;

/** @public */
export function createValidator<TValues extends NativeFormValues>(
  schema: SchemaLike<TValues>,
): Validator<TValues> {
  if ("~standard" in schema) {
    return {
      async validate(values) {
        const result = await schema["~standard"].validate(values);

        if (result.issues) {
          return {
            success: false,
            issues: result.issues.map((issue) => ({
              name: schemaIssuePathToName(issue.path),
              message: issue.message,
            })),
          };
        }

        return {
          success: true,
          values: result.value,
        };
      },
    };
  }

  return schema;
}

function schemaIssuePathToName(
  path: readonly (PropertyKey | { key: PropertyKey })[] | undefined,
): string {
  if (!path || path.length === 0) {
    return "";
  }

  return path
    .map((segment) =>
      typeof segment === "object" && segment !== null ? segment.key : segment,
    )
    .map(String)
    .join(".");
}
