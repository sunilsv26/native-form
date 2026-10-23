import { useEffect, useRef, useState } from "react";

import {
  NativeFormFlatValues,
  NativeFormValue,
  NativeFormValues,
  RuntimeFormState,
} from "@native-form/core";

import { shallowEqual } from "./shallowEqual";
import { UseFormResult } from "./useForm";

/** @public */
export type WatchSelector<TResult> = (state: RuntimeFormState) => TResult;

/** @public */
export interface UseWatchBaseOptions<
  TValues extends NativeFormValues = NativeFormValues,
> {
  form: UseFormResult<TValues>;
  defaultValue?: unknown;
}

/** @public */
export interface UseWatchFieldOptions<
  TValues extends NativeFormValues = NativeFormValues,
> extends UseWatchBaseOptions<TValues> {
  name: string;
  names?: never;
  selector?: never;
}

/** @public */
export interface UseWatchFieldsOptions<
  TValues extends NativeFormValues = NativeFormValues,
> extends UseWatchBaseOptions<TValues> {
  names: readonly string[];
  name?: never;
  selector?: never;
}

/** @public */
export interface UseWatchSelectorOptions<
  TValues extends NativeFormValues = NativeFormValues,
  TResult = unknown,
> extends UseWatchBaseOptions<TValues> {
  selector: WatchSelector<TResult>;
  name?: never;
  names?: never;
}

/** @public */
export interface UseWatchAllOptions<
  TValues extends NativeFormValues = NativeFormValues,
> extends UseWatchBaseOptions<TValues> {
  name?: never;
  names?: never;
  selector?: never;
}

/** @public */
export type UseWatchOptions<
  TValues extends NativeFormValues = NativeFormValues,
  TResult = unknown,
> =
  | UseWatchSelectorOptions<TValues, TResult>
  | UseWatchFieldOptions<TValues>
  | UseWatchFieldsOptions<TValues>
  | UseWatchAllOptions<TValues>;

function computeWatchValue<
  TValues extends NativeFormValues = NativeFormValues,
  TResult = unknown,
>(
  options: UseWatchOptions<TValues, TResult>,
  formState: RuntimeFormState,
): unknown {
  if (options.selector) {
    return options.selector(formState);
  }

  if (typeof options.name === "string") {
    const val = formState.values[options.name];
    if (
      options.defaultValue !== undefined &&
      (val === undefined || val === "")
    ) {
      return options.defaultValue;
    }
    return val;
  }

  if (Array.isArray(options.names)) {
    const result: Record<string, NativeFormValue | undefined> = {};
    const defaultMap = options.defaultValue as
      | Record<string, NativeFormValue | undefined>
      | undefined;

    for (const n of options.names) {
      const val = formState.values[n];
      if (defaultMap?.[n] !== undefined && (val === undefined || val === "")) {
        result[n] = defaultMap[n];
      } else {
        result[n] = val;
      }
    }

    return result;
  }

  return formState.values;
}

/** @public */
export function useWatch<
  TValues extends NativeFormValues = NativeFormValues,
  TResult = unknown,
>(options: UseWatchSelectorOptions<TValues, TResult>): TResult;

/** @public */
export function useWatch<TValues extends NativeFormValues = NativeFormValues>(
  options: UseWatchFieldOptions<TValues>,
): NativeFormValue | undefined;

/** @public */
export function useWatch<TValues extends NativeFormValues = NativeFormValues>(
  options: UseWatchFieldsOptions<TValues>,
): Record<string, NativeFormValue | undefined>;

/** @public */
export function useWatch<TValues extends NativeFormValues = NativeFormValues>(
  options: UseWatchAllOptions<TValues>,
): NativeFormFlatValues;

/** @public */
export function useWatch<
  TValues extends NativeFormValues = NativeFormValues,
  TResult = unknown,
>(options: UseWatchOptions<TValues, TResult>): unknown {
  const formState = options.form.runtime
    ? options.form.runtime.getFormState()
    : options.form.formState;

  const [selected, setSelected] = useState(() =>
    computeWatchValue(options, formState),
  );

  const prevRef = useRef(selected);
  prevRef.current = selected;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const runtime = options.form.runtime;
    if (!runtime) {
      return;
    }

    const evaluate = () => {
      const currentFormState = runtime.getFormState();
      const next = computeWatchValue(optionsRef.current, currentFormState);

      if (!shallowEqual(prevRef.current, next)) {
        prevRef.current = next;
        setSelected(next);
      }
    };

    evaluate();

    const unsubscribe = runtime.subscribe(() => {
      evaluate();
    });

    return () => {
      unsubscribe();
    };
  }, [options.form.runtime]);

  const currentComputed = computeWatchValue(options, formState);
  if (
    !options.form.runtime &&
    !shallowEqual(prevRef.current, currentComputed)
  ) {
    prevRef.current = currentComputed;
    setSelected(currentComputed);
  }

  return selected;
}

