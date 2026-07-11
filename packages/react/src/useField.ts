import { useMemo } from "react";

import {
  FieldState,
  NativeFormValue,
  NativeFormValues,
} from "@native-form/core";

import { UseFormResult } from "./useForm";

/** @public */
export interface UseFieldOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  form: UseFormResult<TValues>;
  name: string;
}

/** @public */
export interface UseFieldResult extends FieldState {
  invalid: boolean;
}

function createUntrackedFieldState(
  name: string,
  values: NativeFormValues,
  errors: Record<string, string>,
): UseFieldResult {
  const value = toFieldValue(values[name]);

  return {
    name,
    mounted: false,
    dirty: false,
    touched: false,
    initialValue: undefined,
    value,
    error: errors[name],
    invalid: Boolean(errors[name]),
  };
}

function toFieldValue(value: unknown): NativeFormValue | undefined {
  if (typeof value === "string" || value instanceof File) {
    return value;
  }

  if (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" || entry instanceof File)
  ) {
    return value;
  }

  return undefined;
}

/** @public */
export function useField<TValues extends NativeFormValues = NativeFormValues>({
  form,
  name,
}: UseFieldOptions<TValues>): UseFieldResult {
  return useMemo(() => {
    const field = form.formState.fields.find((entry) => entry.name === name);

    if (!field) {
      return createUntrackedFieldState(
        name,
        form.formState.values,
        form.formState.errors,
      );
    }

    return {
      ...field,
      error: form.formState.errors[name] ?? field.error,
      invalid: Boolean(form.formState.errors[name] ?? field.error),
    };
  }, [
    form.formState.errors,
    form.formState.fields,
    form.formState.values,
    name,
  ]);
}
