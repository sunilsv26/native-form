import {
  FormEvent,
  FormHTMLAttributes,
  PropsWithChildren,
  useLayoutEffect,
  useRef,
} from "react";

import { Runtime } from "@native-form/core";

export interface FormProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> {
  onSubmit?: (
    values: Record<string, FormDataEntryValue>,
    event: FormEvent<HTMLFormElement>,
  ) => void;
}

export function Form({
  children,
  onSubmit,
  ...props
}: PropsWithChildren<FormProps>) {
  const formRef = useRef<HTMLFormElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);

  useLayoutEffect(() => {
    if (!formRef.current) {
      return;
    }

    const runtime = new Runtime();

    runtime.mount(formRef.current);

    runtimeRef.current = runtime;

    return () => {
      runtime.unmount();
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!runtimeRef.current) {
      return;
    }

    const values = runtimeRef.current.serialize();

    onSubmit?.(values, event);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}
