# @native-form/zod

Zod schema validation adapter for Native Form.

[![npm version](https://img.shields.io/npm/v/@native-form/zod.svg)](https://www.npmjs.com/package/@native-form/zod)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @native-form/zod zod
# or
pnpm add @native-form/zod zod
# or
yarn add @native-form/zod zod
```

## Usage

```tsx
import { useForm } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  age: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
});

export function LoginForm() {
  const form = useForm({
    schema: zodResolver(loginSchema),
    onSubmit: (values) => {
      console.log("Validated values:", values);
    },
  });

  return (
    <form ref={form.formRef}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <input name="age" type="number" />
      <button type="submit">Log In</button>
    </form>
  );
}
```

## License

MIT © [Sunil](https://github.com/sunilsv26)

