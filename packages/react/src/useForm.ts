import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  InferSchemaOutput,
  NativeFormFlatValues,
  NativeFormValue,
  NativeFormValues,
  Runtime,
  RuntimeFormState,
  RuntimeOptions,
  SchemaLike,
} from "@native-form/core";

import { shallowEqual } from "./shallowEqual";

/** @public */
export interface UseFormOptions<
  TSchema extends SchemaLike | undefined = undefined,
  TValues extends NativeFormValues = TSchema extends SchemaLike
    ? InferSchemaOutput<TSchema>
    : NativeFormValues,
  TSelected = RuntimeFormState,
> extends Omit<RuntimeOptions<TValues>, "schema" | "onSubmit" | "onInvalid"> {
  schema?: TSchema;
  onSubmit?: (values: TValues, event?: SubmitEvent) => void | Promise<void>;
  onInvalid?: (
    errors: Record<string, string>,
    values: NativeFormValues,
    event?: SubmitEvent,
  ) => void;
  selector?: (state: RuntimeFormState) => TSelected;
  subscribe?: boolean;
}

/** @public */
export interface UseFormResult<
  TValues extends NativeFormValues = NativeFormValues,
> {
  formRef: React.RefObject<HTMLFormElement | null>;
  runtime: Runtime<TValues> | null;
  formState: ReturnType<Runtime<TValues>["getFormState"]>;
  watch: {
    <TResult>(selector: (state: RuntimeFormState) => TResult): TResult;
    (name: string): NativeFormValue | undefined;
    (names: readonly string[]): Record<string, NativeFormValue | undefined>;
    (): NativeFormFlatValues;
  };
}

function createEmptyFormState() {
  return {
    dirty: false,
    touched: false,
    valid: true,
    submitting: false,
    validating: false,
    errors: {},
    fields: [],
    values: {},
  };
}

/** @public */
export function useForm<
  TSchema extends SchemaLike | undefined = undefined,
  TValues extends NativeFormValues = TSchema extends SchemaLike
    ? InferSchemaOutput<TSchema>
    : NativeFormValues,
  TSelected = RuntimeFormState,
>(options: UseFormOptions<TSchema, TValues, TSelected> = {}): UseFormResult<TValues> {
  const formRef = useRef<HTMLFormElement>(null);
  const runtimeRef = useRef<Runtime<TValues> | null>(null);
  const [formState, setFormState] = useState<
    ReturnType<Runtime<TValues>["getFormState"]>
  >(() => createEmptyFormState());

  const onSubmitRef = useRef(options.onSubmit);
  const onInvalidRef = useRef(options.onInvalid);
  const schemaRef = useRef(options.schema);
  const validatorRef = useRef(options.validator);
  const pipelineRef = useRef(options.pipeline);
  const selectorRef = useRef(options.selector);
  const subscribeRef = useRef(options.subscribe);

  onSubmitRef.current = options.onSubmit;
  onInvalidRef.current = options.onInvalid;
  schemaRef.current = options.schema;
  validatorRef.current = options.validator;
  pipelineRef.current = options.pipeline;
  selectorRef.current = options.selector;
  subscribeRef.current = options.subscribe;

  const selectedRef = useRef<unknown>(
    options.selector ? options.selector(formState) : formState,
  );

  useLayoutEffect(() => {
    if (!formRef.current) {
      return;
    }

    const runtime = new Runtime<TValues>({
      mode: options.mode,
      serializationMode: options.serializationMode,
      serializeFieldsOptions: options.serializeFieldsOptions,
      nesting: options.nesting,
      debounceMs: options.debounceMs,
      asyncValidators: options.asyncValidators,
      schema: schemaRef.current as SchemaLike<TValues> | undefined,
      validator: validatorRef.current,
      pipeline: pipelineRef.current,
      onSubmit: (values, event) => onSubmitRef.current?.(values, event),
      onInvalid: (errors, values, event) =>
        onInvalidRef.current?.(errors, values, event),
    });

    runtime.mount(formRef.current);
    runtimeRef.current = runtime;

    const initialFormState = runtime.getFormState();
    setFormState(initialFormState);
    if (selectorRef.current) {
      selectedRef.current = selectorRef.current(initialFormState);
    }

    const unsubscribe = runtime.subscribe(() => {
      if (subscribeRef.current === false) {
        return;
      }

      const nextFormState = runtime.getFormState();

      if (selectorRef.current) {
        const nextSelected = selectorRef.current(nextFormState);
        if (!shallowEqual(selectedRef.current, nextSelected)) {
          selectedRef.current = nextSelected;
          setFormState(nextFormState);
        }
      } else {
        setFormState(nextFormState);
      }
    });

    return () => {
      unsubscribe();
      runtime.unmount();
      runtimeRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (runtimeRef.current) {
      runtimeRef.current.setOptions({
        mode: options.mode,
        serializationMode: options.serializationMode,
        serializeFieldsOptions: options.serializeFieldsOptions,
        nesting: options.nesting,
        debounceMs: options.debounceMs,
        asyncValidators: options.asyncValidators,
        schema: options.schema as any,
        validator: options.validator,
        pipeline: options.pipeline,
      });
    }
  }, [
    options.mode,
    options.serializationMode,
    options.serializeFieldsOptions,
    options.nesting,
    options.debounceMs,
    options.asyncValidators,
    options.schema,
    options.validator,
    options.pipeline,
  ]);

  const watch = useCallback(
    ((
      target?:
        | string
        | readonly string[]
        | ((state: RuntimeFormState) => unknown),
    ) => {
      if (typeof target === "string") {
        if (runtimeRef.current) {
          return runtimeRef.current.getFieldValue(target);
        }
        return formState.values[target];
      }

      if (Array.isArray(target)) {
        const result: Record<string, NativeFormValue | undefined> = {};
        for (const n of target) {
          result[n] = runtimeRef.current
            ? runtimeRef.current.getFieldValue(n)
            : formState.values[n];
        }
        return result;
      }

      const currentState = runtimeRef.current
        ? runtimeRef.current.getFormState()
        : formState;

      if (typeof target === "function") {
        return target(currentState);
      }

      return currentState.values;
    }) as UseFormResult<TValues>["watch"],
    [formState],
  );

  return {
    formRef,
    runtime: runtimeRef.current,
    formState,
    watch,
  };
}
