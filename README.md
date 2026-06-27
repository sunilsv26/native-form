# Native Form

Native HTML-first form runtime and adapters.

## Docs

- Architecture: `docs/ARCHITECTURE.md`
- Contributing guide: `docs/CONTRIBUTING.md`

## Packages

- `@native-form/core`: framework-agnostic runtime, discovery, registry, serialization, and validation pipeline contracts.
- `@native-form/react`: React bindings/components that consume core runtime behavior.
- `@native-form/zod`: Zod adapter layer for schema-driven validation integration.

## Development

```bash
pnpm test
pnpm build
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

Validation example (with Zod):

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

On invalid submit/change, runtime-managed inline/native error messages are applied next to the affected field.
