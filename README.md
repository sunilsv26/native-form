# Native Form

> Zero-registration, native HTML-first form runtime and validation engine for modern web apps.

[![npm version](https://img.shields.io/npm/v/@native-form/core.svg)](https://www.npmjs.com/package/@native-form/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Traditional form libraries force you to register every input with JavaScript refs or state wrappers (`{...register('field')}`). **Native Form** works differently: it respects standard HTML forms and automatically discovers inputs directly from the DOM using standard `name` attributes.

---

## 🌐 Cross-Platform Architecture

Native Form is architected into lightweight, decoupled modules so you can use it in **any framework or in pure vanilla JavaScript**:

```
                       ┌───────────────────────┐
                       │   @native-form/core   │ (Vanilla JS, Vue, Svelte, Angular)
                       └───────────┬───────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌─────────────────────┐ ┌───────────────┐ ┌────────────────────┐
   │  @native-form/react │ │ Schema Adapters│ │ Framework Adapters │
   │ (React 18 & 19 Hooks│ │ (Zod/Yup/Vali)│ │   (Vue / Svelte)   │
   └─────────────────────┘ └───────────────┘ └────────────────────┘
```

| Platform / Framework                | Package                                                                   | Quick Install                                |
| :---------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------- |
| **Vanilla JS / TypeScript**         | [`@native-form/core`](packages/core/README.md)                            | `npm i @native-form/core`                    |
| **Vue.js (Vue 3 `<script setup>`)** | [`@native-form/core`](packages/core/README.md#2-vuejs-vue-3-script-setup) | `npm i @native-form/core`                    |
| **Svelte (Svelte 4 & 5)**           | [`@native-form/core`](packages/core/README.md#3-svelte-svelte-4--5)       | `npm i @native-form/core`                    |
| **React (18 & 19, Next.js, Remix)** | [`@native-form/react`](packages/react/README.md)                          | `npm i @native-form/react`                   |
| **Zod Schema Validation**           | [`@native-form/zod`](packages/zod/README.md)                              | `npm i @native-form/zod zod`                 |
| **Valibot Schema Validation**       | [`@native-form/valibot`](packages/valibot/README.md)                      | `npm i @native-form/valibot valibot`         |
| **Yup Schema Validation**           | [`@native-form/yup`](packages/yup/README.md)                              | `npm i @native-form/yup yup`                 |

---

## Key Highlights

- **Zero Registration**: Inputs are discovered automatically via standard `name` attributes.
- **Minimal Re-renders**: Uncontrolled DOM-first inputs mean keystrokes do not trigger component re-renders.
- **Typed & Native Serialization**: Extract raw string/FormData or automatically coerce inputs to typed numbers, booleans, and arrays.
- **Nested Object Paths**: Built-in support for dot notation (`user.email`) and bracket notation (`items[0].name`).
- **Async Validation Pipeline**: Debounced validation with automatic `AbortController` cancellation for in-flight requests.
- **Multi-Step Memory Hydration**: `preserveUnmountedValues: true` preserves data across unmounted wizard steps.

---

## Quick Starts

### 1. In React

```tsx
import React from "react";
import { useForm } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  age: z.number().min(18, "Must be at least 18"),
});

export function LoginForm() {
  const { formRef, formState } = useForm({
    schema: zodResolver(schema),
    serializationMode: "typed", // automatically coerces type="number" and range to numbers
    onSubmit: (values) => console.log("Validated:", values),
  });

  return (
    <form ref={formRef} noValidate>
      <div>
        <label>Email</label>
        <input name="email" type="email" placeholder="jane@example.com" />
        {formState.errors.email && (
          <p style={{ color: "red" }}>{formState.errors.email}</p>
        )}
      </div>

      <div>
        <label>Age</label>
        <input name="age" type="number" placeholder="25" />
        {formState.errors.age && (
          <p style={{ color: "red" }}>{formState.errors.age}</p>
        )}
      </div>

      <button type="submit" disabled={formState.submitting}>
        {formState.submitting ? "Validating..." : "Submit"}
      </button>
    </form>
  );
}
```

### 2. In Plain Vanilla JS

```html
<form id="login-form">
  <input name="email" type="email" required />
  <input name="age" type="number" min="18" />
  <button type="submit">Submit</button>
</form>
```

```ts
import { Runtime } from "@native-form/core";

const formEl = document.getElementById("login-form") as HTMLFormElement;

const runtime = new Runtime({
  mode: "onBlur",
  serializationMode: "typed",
  onSubmit: (values) => {
    console.log("Submitted typed values:", values);
  },
});

runtime.mount(formEl);
```

### 3. In Vue 3

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Runtime } from "@native-form/core";

const formRef = ref<HTMLFormElement | null>(null);
let runtime: Runtime | null = null;

onMounted(() => {
  if (formRef.value) {
    runtime = new Runtime({
      mode: "onBlur",
      onSubmit: (values) => console.log("Vue form values:", values),
    });
    runtime.mount(formRef.value);
  }
});

onUnmounted(() => runtime?.unmount());
</script>

<template>
  <form ref="formRef" novalidate>
    <input name="email" type="email" required />
    <input name="password" type="password" minlength="8" required />
    <button type="submit">Log In</button>
  </form>
</template>
```

---

## React StrictMode & SSR Compatibility

* **React 18 & 19 StrictMode**: Handled cleanly with an idempotent teardown lifecycle. On unmount, `runtime.unmount()` removes all DOM event listeners, disconnects the `MutationObserver`, aborts pending validations, and clears timers. On remount, discovery synchronizes immediately without duplicate listeners or memory leaks.
* **Next.js & Remix SSR**: Because Native Form uses standard HTML inputs, forms render into plain HTML on the server with **zero hydration mismatch**. During client hydration, all existing server-rendered inputs are indexed synchronously on initial mount before observing future mutations.

---

## Monorepo Packages

- **[`packages/core`](packages/core/README.md)**: Core framework-agnostic runtime and DOM observer.
- **[`packages/react`](packages/react/README.md)**: React bindings and hooks (`useForm`, `useField`, `useWatch`, `useFieldArray`, `useWizard`).
- **[`packages/zod`](packages/zod/README.md)**: Zod validation adapter (`zodResolver`).
- **[`packages/yup`](packages/yup/README.md)**: Yup validation adapter (`yupResolver`).
- **[`packages/valibot`](packages/valibot/README.md)**: Valibot validation adapter (`valibotResolver`).

---

## Local Development & Playground

To run the interactive playground locally:

```bash
pnpm install
pnpm --filter native-form-example-vite dev
```

To run test suites and type-checking across all packages:

```bash
pnpm verify
```

---

## License

MIT © [Sunil](https://github.com/sunilsv26)
