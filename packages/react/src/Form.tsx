import {
  FormHTMLAttributes,
  PropsWithChildren,
  useLayoutEffect,
  useRef,
} from "react";

import {
  InferSchemaOutput,
  NativeFormValues,
  Runtime,
  SchemaLike,
} from "@native-form/core";

export interface FormProps<
  TSchema extends SchemaLike | undefined = undefined,
  TValues extends NativeFormValues = TSchema extends SchemaLike
    ? InferSchemaOutput<TSchema>
    : NativeFormValues,
> extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onInvalid"> {
  schema?: TSchema;
  onSubmit?: (values: TValues, event?: SubmitEvent) => void | Promise<void>;
  onInvalid?: (
    errors: Record<string, string>,
    values: NativeFormValues,
    event?: SubmitEvent,
  ) => void;
}

export function Form<
  TSchema extends SchemaLike | undefined = undefined,
  TValues extends NativeFormValues = TSchema extends SchemaLike
    ? InferSchemaOutput<TSchema>
    : NativeFormValues,
>({
  children,
  schema,
  onSubmit,
  onInvalid,
  ...props
}: PropsWithChildren<FormProps<TSchema, TValues>>) {
  const formRef = useRef<HTMLFormElement>(null);
  const runtimeRef = useRef<Runtime<TValues> | null>(null);
  const onSubmitRef = useRef(onSubmit);
  const onInvalidRef = useRef(onInvalid);

  onSubmitRef.current = onSubmit;
  onInvalidRef.current = onInvalid;

  useLayoutEffect(() => {
    if (!formRef.current) {
      return;
    }

    const runtime = new Runtime<TValues>({
      schema: schema as SchemaLike<TValues> | undefined,
      onSubmit: (values, event) => onSubmitRef.current?.(values, event),
      onInvalid: (errors, values, event) =>
        onInvalidRef.current?.(errors, values, event),
    });

    runtime.mount(formRef.current);

    runtimeRef.current = runtime;

    return () => {
      runtime.unmount();
    };
  }, [schema]);

  return (
    <form ref={formRef} {...props}>
      {children}
    </form>
  );
}
