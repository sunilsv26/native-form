# @native-form/react

React hooks and components for Native Form — native HTML-first forms with zero manual registration.

[![npm version](https://img.shields.io/npm/v/@native-form/react.svg)](https://www.npmjs.com/package/@native-form/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- **No `register()` Boilerplate**: Native inputs just work via standard `name` attributes.
- **Minimal Re-renders**: Uncontrolled DOM-first inputs mean typing doesn't re-render your component tree.
- **Fine-Grained Telemetry**: `useWatch` and `useField` for subscription-only state updates.
- **Dynamic Field Arrays**: `useFieldArray` supporting append, prepend, insert, remove, swap, and move with DOM sync.
- **Multi-Step Wizards**: `useWizard` with step-by-step validation gating and unmounted memory caching.
- **React 18 & 19 Ready**: Full compatibility with modern concurrent rendering.

## Installation

```bash
npm install @native-form/react @native-form/core
# or
pnpm add @native-form/react @native-form/core
# or
yarn add @native-form/react @native-form/core
```

## Quick Start

```tsx
import React from "react";
import { useForm, useField } from "@native-form/react";

function Input({ form, name, label, type = "text" }: { form: any; name: string; label: string; type?: string }) {
  const field = useField({ form, name });
  return (
    <div>
      <label>{label}</label>
      <input name={name} type={type} />
      {field.error && <p style={{ color: "red" }}>{field.error}</p>}
    </div>
  );
}

export function LoginForm() {
  const form = useForm({
    mode: "onBlur",
    onSubmit: (values) => {
      console.log("Form values:", values);
    },
  });

  return (
    <form ref={form.formRef}>
      <Input form={form} name="email" label="Email" type="email" />
      <Input form={form} name="password" label="Password" type="password" />
      <button type="submit" disabled={form.formState.submitting}>
        {form.formState.submitting ? "Submitting..." : "Sign In"}
      </button>
    </form>
  );
}
```

## Schema Validation

Native Form supports first-class schema validation adapters:
- `@native-form/zod`
- `@native-form/yup`
- `@native-form/valibot`

```tsx
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const form = useForm({
  schema: zodResolver(schema),
  onSubmit: (values) => { ... },
});
```

## License

MIT © [Sunil](https://github.com/sunilsv26)
