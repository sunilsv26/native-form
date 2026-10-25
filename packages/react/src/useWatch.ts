import { useEffect, useRef, useState } from "react";

import {
  NativeFormFlatValues,
  NativeFormValue,
  NativeFormValues,
  Runtime,
  RuntimeFormState,
  SerializationMode,
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
  mode?: SerializationMode;
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
  runtime?: Runtime<TValues> | null,
): unknown {
  if (options.selector) {
    return options.selector(formState);
  }

  const effectiveMode =
    options.mode ?? runtime?.serializationMode ?? "native";

  if (typeof options.name === "string") {
    let val: NativeFormValue | undefined;
    if (runtime) {
      if (options.mode === "native") {
        val = runtime.serialize()[options.name];
      } else {
        val = runtime.getFieldValue(options.name);
      }
    } else {
      val = formState.values[options.name];
    }

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

    const sourceValues =
      runtime && options.mode === "native" ? runtime.serialize() : null;

    for (const n of options.names) {
      let val: NativeFormValue | undefined;
      if (runtime) {
        if (options.mode === "native") {
          val = sourceValues?.[n];
        } else {
          val = runtime.getFieldValue(n);
        }
      } else {
        val = formState.values[n];
      }

      if (defaultMap?.[n] !== undefined && (val === undefined || val === "")) {
        result[n] = defaultMap[n];
      } else {
        result[n] = val;
      }
    }

    return result;
  }

  if (runtime) {
    return effectiveMode === "typed"
      ? runtime.serializeFields()
      : runtime.serialize();
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
  const runtime = options.form.runtime;
  const formState = runtime
    ? runtime.getFormState()
    : options.form.formState;

  const [selected, setSelected] = useState(() =>
    computeWatchValue(options, formState, runtime),
  );

  const prevRef = useRef(selected);
  prevRef.current = selected;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const currentRuntime = options.form.runtime;
    if (!currentRuntime) {
      return;
    }

    const evaluate = () => {
      const opts = optionsRef.current;
      const currentFormState = currentRuntime.getFormState();
      const next = computeWatchValue(opts, currentFormState, currentRuntime);

      if (!shallowEqual(prevRef.current, next)) {
        prevRef.current = next;
        setSelected(next);
      }
    };

    evaluate();

    const unsubscribe = currentRuntime.subscribe(() => {
      evaluate();
    });

    return () => {
      unsubscribe();
    };
  }, [options.form.runtime]);

  const currentComputed = computeWatchValue(options, formState, runtime);
  if (
    !runtime &&
    !shallowEqual(prevRef.current, currentComputed)
  ) {
    prevRef.current = currentComputed;
    setSelected(currentComputed);
  }

  return selected;
}

