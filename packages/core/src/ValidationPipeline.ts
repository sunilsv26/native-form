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

export interface ValidationPipeline<
  TValues extends NativeFormValues = NativeFormValues,
> {
  validate(
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
