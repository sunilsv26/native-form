# @native-form/valibot

Valibot schema validation adapter for Native Form.

[![npm version](https://img.shields.io/npm/v/@native-form/valibot.svg)](https://www.npmjs.com/package/@native-form/valibot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @native-form/valibot valibot
# or
pnpm add @native-form/valibot valibot
# or
yarn add @native-form/valibot valibot
```

## Usage

```tsx
import { useForm } from "@native-form/react";
import { valibotResolver } from "@native-form/valibot";
import * as v from "valibot";

const loginSchema = v.object({
  email: v.pipe(v.string(), v.email("Invalid email address")),
  password: v.pipe(v.string(), v.minLength(8, "Password must be at least 8 characters")),
});

export function LoginForm() {
  const form = useForm({
    schema: valibotResolver(loginSchema),
    onSubmit: (values) => {
      console.log("Validated values:", values);
    },
  });

  return (
    <form ref={form.formRef}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button type="submit">Log In</button>
    </form>
  );
}
```

## License

MIT © [Sunil](https://github.com/sunilsv26)
