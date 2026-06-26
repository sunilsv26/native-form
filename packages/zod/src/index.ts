import {
  NativeFormValues,
  ValidationContext,
  Validator,
} from "@native-form/core";
import { z } from "zod";

export function zodResolver<TSchema extends z.ZodType<NativeFormValues>>(
  schema: TSchema,
): Validator<z.output<TSchema>> {
  return {
    async validate(values, context) {
      const result = await schema.safeParseAsync(values);

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
        values: result.data,
      };
    },
  };
}
