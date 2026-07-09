# Migration from React Hook Form and Formik

This guide shows how to move to Native Form while keeping native markup and schema validation.

## Mindset Shift

React Hook Form and Formik usually ask you to register or wire fields explicitly.

Native Form uses the browser DOM as source of truth.

If an input has a name attribute, it is discovered automatically.

## Basic Example

Before (registration approach):

- register each field
- connect handlers per control

After (Native Form approach):

- write native form controls with name
- pass schema/resolver once at form boundary

Example:

```tsx
import { Form } from "@native-form/react";

export function LoginForm() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button type="submit">Submit</button>
    </Form>
  );
}
```

## Validation

### Zod

```tsx
import { z } from "zod";
import { Form } from "@native-form/react";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

export function LoginForm() {
  return (
    <Form schema={schema} onSubmit={(values) => console.log(values)}>
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </Form>
  );
}
```

### Yup (planned adapter)

The yup adapter is tracked in NF-014.

## Field-level status

Use useField when you need field state in UI logic.

```tsx
import { useField, useForm } from "@native-form/react";

export function LoginForm() {
  const form = useForm();
  const email = useField({ form, name: "email" });

  return (
    <form ref={form.formRef} noValidate>
      <input name="email" type="email" />
      {email.invalid ? <p>{email.error}</p> : null}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Notes for teams

- Keep using native form semantics and accessibility defaults.
- Prefer dotted names for nested paths, for example user.email.
- Keep schema adapters pure and contract-compliant with core Validator behavior.
