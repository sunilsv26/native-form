import { useEffect, useRef, useState } from "react";

import {
  FieldState,
  NativeFormValue,
  NativeFormValues,
  RuntimeFormState,
} from "@native-form/core";

import { shallowEqual } from "./shallowEqual";
import { UseFormResult } from "./useForm";

/** @public */
export interface UseFieldOptions<
  TValues extends NativeFormValues = NativeFormValues,
  TSelected = UseFieldResult,
> {
  form: UseFormResult<TValues>;
  name: string;
  selector?: (field: UseFieldResult) => TSelected;
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

function getFieldSnapshot(
  name: string,
  formState: RuntimeFormState,
): UseFieldResult {
  const field = formState.fields.find((entry) => entry.name === name);

  if (!field) {
    return createUntrackedFieldState(
      name,
      formState.values,
      formState.errors,
    );
  }

  return {
    ...field,
    error: formState.errors[name] ?? field.error,
    invalid: Boolean(formState.errors[name] ?? field.error),
  };
}

/** @public */
export function useField<
  TValues extends NativeFormValues = NativeFormValues,
  TSelected = UseFieldResult,
>({
  form,
  name,
  selector,
}: UseFieldOptions<TValues, TSelected>): TSelected {
  const formState = form.runtime
    ? form.runtime.getFormState()
    : form.formState;

  const currentResult = getFieldSnapshot(name, formState);
  const currentSelected = selector
    ? selector(currentResult)
    : (currentResult as unknown as TSelected);

  const [selected, setSelected] = useState<TSelected>(() => currentSelected);
  const prevRef = useRef(selected);
  prevRef.current = selected;

  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    const runtime = form.runtime;
    if (!runtime) {
      return;
    }

    const evaluate = () => {
      const state = runtime.getFormState();
      const fieldRes = getFieldSnapshot(nameRef.current, state);
      const nextSelected = selectorRef.current
        ? selectorRef.current(fieldRes)
        : (fieldRes as unknown as TSelected);

      if (!shallowEqual(prevRef.current, nextSelected)) {
        prevRef.current = nextSelected;
        setSelected(nextSelected);
      }
    };

    evaluate();

    const unsubscribe = runtime.subscribe(() => {
      evaluate();
    });

    return () => {
      unsubscribe();
    };
  }, [form.runtime]);

  // When form.runtime is not mounted yet, stay in sync with form.formState
  if (!form.runtime && !shallowEqual(prevRef.current, currentSelected)) {
    prevRef.current = currentSelected;
    setSelected(currentSelected);
  }

  return form.runtime ? selected : currentSelected;
}
