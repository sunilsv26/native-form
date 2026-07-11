import { FormHTMLAttributes, PropsWithChildren } from "react";

import {
  InferSchemaOutput,
  NativeFormValues,
  SchemaLike,
} from "@native-form/core";

import { useForm } from "./useForm";

/** @public */
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

/** @public */
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
  const { formRef } = useForm<TSchema, TValues>({
    schema,
    onSubmit,
    onInvalid,
  });

  return (
    <form ref={formRef} {...props}>
      {children}
    </form>
  );
}
