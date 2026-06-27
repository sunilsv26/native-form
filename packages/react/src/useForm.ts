import { useLayoutEffect, useRef, useState } from "react";

import {
  InferSchemaOutput,
  NativeFormValues,
  Runtime,
  RuntimeOptions,
  SchemaLike,
} from "@native-form/core";

export interface UseFormOptions<
  TSchema extends SchemaLike | undefined = undefined,
  TValues extends NativeFormValues = TSchema extends SchemaLike
    ? InferSchemaOutput<TSchema>
    : NativeFormValues,
> extends Omit<RuntimeOptions<TValues>, "schema" | "onSubmit" | "onInvalid"> {
  schema?: TSchema;
  onSubmit?: (values: TValues, event?: SubmitEvent) => void | Promise<void>;
  onInvalid?: (
    errors: Record<string, string>,
    values: NativeFormValues,
    event?: SubmitEvent,
  ) => void;
}

export interface UseFormResult<
  TValues extends NativeFormValues = NativeFormValues,
> {
  formRef: React.RefObject<HTMLFormElement | null>;
  runtime: Runtime<TValues> | null;
  formState: ReturnType<Runtime<TValues>["getFormState"]>;
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

export function useForm<
  TSchema extends SchemaLike | undefined = undefined,
  TValues extends NativeFormValues = TSchema extends SchemaLike
    ? InferSchemaOutput<TSchema>
    : NativeFormValues,
>(options: UseFormOptions<TSchema, TValues> = {}): UseFormResult<TValues> {
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

  onSubmitRef.current = options.onSubmit;
  onInvalidRef.current = options.onInvalid;
  schemaRef.current = options.schema;
  validatorRef.current = options.validator;
  pipelineRef.current = options.pipeline;

  useLayoutEffect(() => {
    if (!formRef.current) {
      return;
    }

    const runtime = new Runtime<TValues>({
      schema: schemaRef.current as SchemaLike<TValues> | undefined,
      validator: validatorRef.current,
      pipeline: pipelineRef.current,
      onSubmit: (values, event) => onSubmitRef.current?.(values, event),
      onInvalid: (errors, values, event) =>
        onInvalidRef.current?.(errors, values, event),
    });

    runtime.mount(formRef.current);
    runtimeRef.current = runtime;
    setFormState(runtime.getFormState());

    const unsubscribe = runtime.subscribe(() => {
      setFormState(runtime.getFormState());
    });

    return () => {
      unsubscribe();
      runtime.unmount();
      runtimeRef.current = null;
    };
  }, []);

  return {
    formRef,
    runtime: runtimeRef.current,
    formState,
  };
}
