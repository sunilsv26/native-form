# @native-form/yup

Yup schema validation adapter for Native Form.

[![npm version](https://img.shields.io/npm/v/@native-form/yup.svg)](https://www.npmjs.com/package/@native-form/yup)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @native-form/yup yup
# or
pnpm add @native-form/yup yup
# or
yarn add @native-form/yup yup
```

## Usage

```tsx
import { useForm } from "@native-form/react";
import { yupResolver } from "@native-form/yup";
import * as yup from "yup";

const loginSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters").required(),
});

export function LoginForm() {
  const form = useForm({
    schema: yupResolver(loginSchema),
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

