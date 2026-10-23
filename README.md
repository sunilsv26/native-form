# Native Form

Native HTML-first form runtime and adapters.

## Docs

- Architecture: [docs/architecture.md](docs/architecture.md)
- API reference: [docs/API.md](docs/API.md)
- Product roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Weekly execution board: [docs/WEEKLY_EXECUTION_BOARD.md](docs/WEEKLY_EXECUTION_BOARD.md)
- RHF/Formik migration guide: [docs/MIGRATION_RHF.md](docs/MIGRATION_RHF.md)
- Contributing guide: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- Design specification: [docs/DESIGN.md](docs/DESIGN.md)
- Lifecycle contract: [docs/LIFECYCLE.md](docs/LIFECYCLE.md)
- Release checklist: [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)
- Runtime module: [docs/RUNTIME.md](docs/RUNTIME.md)
- FieldNode module: [docs/FIELDNODE.md](docs/FIELDNODE.md)
- Validation module: [docs/VALIDATION.md](docs/VALIDATION.md)

## Packages

- `@native-form/core`: framework-agnostic runtime, discovery, registry, serialization, path helpers, and validation pipeline contracts.
- `@native-form/react`: React bindings, components, and hooks (`<Form>`, `useForm`, `useField`, `useWatch`).
- `@native-form/zod`: Zod adapter layer for schema-driven validation integration (`zodResolver`).
- `@native-form/yup`: Yup adapter layer for schema-driven validation integration (`yupResolver`).
- `@native-form/adapter-contracts`: shared test fixtures and contract test matrix across schema adapters.

## Development

```bash
pnpm test
pnpm build
pnpm verify
```

## Quick Start (Example)

Run the Vite example app:

```bash
pnpm --filter native-form-example-vite dev
```

Minimal usage shape:

```tsx
import { Form } from "@native-form/react";

export function LoginForm() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </Form>
  );
}
```

Fields are discovered automatically by their `name` attribute (no manual registration).

### Validation with Zod

```tsx
import { z } from "zod";
import { Form } from "@native-form/react";
import { zodResolver } from "@native-form/zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

export function LoginForm() {
  return (
    <Form schema={zodResolver(schema)} onSubmit={(values) => console.log(values)}>
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </Form>
  );
}
```

### Validation with Yup

```tsx
import * as yup from "yup";
import { Form } from "@native-form/react";
import { yupResolver } from "@native-form/yup";

const schema = yup.object({
  email: yup.string().email("Invalid email").required(),
});

export function LoginForm() {
  return (
    <Form schema={yupResolver(schema)} onSubmit={(values) => console.log(values)}>
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </Form>
  );
}
```

### Hooks (`useForm` + `useField`)

```tsx
import { useMemo } from "react";
import { useField, useForm } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const schemaDef = z.object({
  email: z.string().email("Invalid email"),
});

export function LoginForm() {
  // Keep resolver identity stable to avoid unnecessary reconfiguration.
  const schema = useMemo(() => zodResolver(schemaDef), []);
  const form = useForm({ schema });
  const email = useField({ form, name: "email" });

  return (
    <form ref={form.formRef} noValidate>
      <input name="email" type="email" />
      {email.error ? <p>{email.error}</p> : null}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Targeted Watch & Selective Subscriptions (`useWatch`)

Use `useWatch` to subscribe to individual fields, multi-field lists, or computed slices without re-rendering the whole form:

```tsx
import { useForm, useWatch, useField } from "@native-form/react";

function EmailPreview({ form }) {
  // Only re-renders when "email" value changes
  const email = useWatch({ form, name: "email" });
  return <p>Preview: {String(email ?? "")}</p>;
}

function SubmitButton({ form }) {
  // Only re-renders when validity state flips
  const isValid = useWatch({ form, selector: (state) => state.valid });
  return <button disabled={!isValid} type="submit">Submit</button>;
}

export function RegistrationForm() {
  // subscribe: false decouples parent form from input keystrokes
  const form = useForm({ subscribe: false });

  return (
    <form ref={form.formRef}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <EmailPreview form={form} />
      <SubmitButton form={form} />
    </form>
  );
}
```

### Path Helpers (Nested & Array Field Names)

```tsx
import {
  arrayItemPath,
  formPath,
  parseArrayItemPath,
  shiftArrayItemIndex,
  splitPath,
} from "@native-form/core";

// Path building:
const USER_EMAIL = formPath("user", "email"); // "user.email"
const TEAMMATE_0_EMAIL = arrayItemPath("teammates", 0, "email"); // "teammates.0.email"

// Path parsing & array shifting on deletion:
splitPath("items.0.name"); // ["items", "0", "name"]
parseArrayItemPath("items.0.name"); // { arrayName: "items", index: 0, subPath: "name" }
shiftArrayItemIndex("items.2.name", "items", 1, -1); // "items.1.name"
```

On invalid submit/change, runtime-managed inline/native error messages are applied next to the affected field.
