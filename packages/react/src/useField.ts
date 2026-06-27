import { useMemo } from "react";

import { FieldState, NativeFormValues } from "@native-form/core";

import { UseFormResult } from "./useForm";

export interface UseFieldOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  form: UseFormResult<TValues>;
  name: string;
}

export interface UseFieldResult extends FieldState {
  invalid: boolean;
}

function createUntrackedFieldState(
  name: string,
  values: NativeFormValues,
  errors: Record<string, string>,
): UseFieldResult {
  return {
    name,
    mounted: false,
    dirty: false,
    touched: false,
    initialValue: undefined,
    value: values[name],
    error: errors[name],
    invalid: Boolean(errors[name]),
  };
}

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
