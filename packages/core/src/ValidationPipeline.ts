import { FieldNode } from "./FieldNode";
import {
  createValidator,
  SchemaLike,
  ValidationContext,
  ValidationIssue,
  ValidationResult,
  Validator,
} from "./Validation";
import { NativeFormValues } from "./types";

export interface ValidationPipelineContext extends ValidationContext {
  fields: FieldNode[];
}

export interface ValidationPipelineCapabilities {
  /**
   * When true, Runtime will call `validateField` for input/change-triggered
   * validation. When false, Runtime falls back to `validate` even for
   * field-triggered events.
   */
  supportsFieldScopedValidation: boolean;
}

export interface ValidationPipeline<
  TValues extends NativeFormValues = NativeFormValues,
> {
  /**
   * Declares optional runtime behavior flags for how this pipeline wants to be
   * invoked.
   */
  readonly capabilities?: ValidationPipelineCapabilities;

  /**
   * @example
   * const pipeline: ValidationPipeline = {
   *   capabilities: { supportsFieldScopedValidation: false },
   *   async validate(values) {
   *     return { success: true, values };
   *   },
   *   async validateField(_field, values) {
   *     return { success: true, values };
   *   },
   * };
   */

  /**
   * Validates the full serialized values snapshot.
   *
   * Used for full-form validation flows (for example, submit).
   */
  validate(
    values: NativeFormValues,
    context: ValidationPipelineContext,
  ): ValidationResult<TValues> | Promise<ValidationResult<TValues>>;

  /**
   * Validates a field-triggered update with access to the active field and the
   * full serialized snapshot.
   *
   * Used for input/change-triggered validation when supported.
   */
  validateField(
    field: FieldNode,
    values: NativeFormValues,
    context: ValidationPipelineContext,
  ): ValidationResult<TValues> | Promise<ValidationResult<TValues>>;
}

export interface ValidationPipelineOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  schema?: SchemaLike<TValues>;
  validator?: Validator<TValues>;
}

export function createValidationPipeline<
  TValues extends NativeFormValues = NativeFormValues,
>(
  options: ValidationPipelineOptions<TValues> = {},
): ValidationPipeline<TValues> {
  const schema = options.schema ?? options.validator;
  const validator = schema ? createValidator(schema) : undefined;

  return {
    capabilities: {
      supportsFieldScopedValidation: !validator,
    },

    async validate(values, context) {
      // No custom validator: rely on native browser validity.
      if (!validator) {
        const nativeIssues = getNativeValidationIssues(context.fields);

        if (nativeIssues.length > 0) {
          return {
            success: false,
            issues: nativeIssues,
          };
        }

        return {
          success: true,
          values: values as TValues,
        };
      }

      return validator.validate(values, context);
    },

    async validateField(field, values, context) {
      // No custom validator: rely on native validity for the active field only.
      if (!validator) {
        const issue = getNativeValidationIssue(field);

        if (issue) {
          return {
            success: false,
            issues: [issue],
          };
        }

        return {
          success: true,
          values: values as TValues,
        };
      }

      // For schema/validator-based validation we currently validate the
      // full snapshot and let adapter/schema decide issue granularity.
      return validator.validate(values, context);
    },
  };
}

function getNativeValidationIssue(
  field: FieldNode,
): ValidationIssue | undefined {
  const validationMessage = field.element.validationMessage;

  if (!validationMessage) {
    return undefined;
  }

  return {
    name: field.name,
    message: validationMessage,
  };
}

function getNativeValidationIssues(fields: FieldNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of fields) {
    const validationMessage = field.element.validationMessage;

    if (validationMessage) {
      issues.push({
        name: field.name,
        message: validationMessage,
      });
    }
  }

  return issues;
}
