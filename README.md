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

| Platform / Framework | Package | Quick Install | Minified (Gzip) |
| :--- | :--- | :--- | :--- |
| **Vanilla JS / TypeScript** | [`@native-form/core`](packages/core/README.md) | `npm i @native-form/core` | **9.6 KB** |
| **Vue.js (Vue 3 `<script setup>`)** | [`@native-form/core`](packages/core/README.md#2-vuejs-vue-3-script-setup) | `npm i @native-form/core` | **9.6 KB** |
| **Svelte (Svelte 4 & 5)** | [`@native-form/core`](packages/core/README.md#3-svelte-svelte-4--5) | `npm i @native-form/core` | **9.6 KB** |
| **React (18 & 19, Next.js, Remix)** | [`@native-form/react`](packages/react/README.md) | `npm i @native-form/react @native-form/core` | **18.1 KB** (incl. core) |
| **Zod Schema Validation** | [`@native-form/zod`](packages/zod/README.md) | `npm i @native-form/zod zod` | **0.4 KB** (445 B) |
| **Valibot Schema Validation** | [`@native-form/valibot`](packages/valibot/README.md) | `npm i @native-form/valibot valibot` | **0.4 KB** (457 B) |
| **Yup Schema Validation** | [`@native-form/yup`](packages/yup/README.md) | `npm i @native-form/yup yup` | **0.5 KB** (519 B) |

---

## 📦 Bundle Size & Lightweight Footprint

Native Form is engineered for speed with zero bloat. It has **zero third-party runtime dependencies**:

| Package | Minified | Gzipped | Brotli | Dependencies |
| :--- | :---: | :---: | :---: | :---: |
| **`@native-form/core`** | 45.8 KB | **9.6 KB** | 8.4 KB | **0 (Zero)** |
| **`@native-form/react`** (standalone) | 30.9 KB | **9.1 KB** | 8.0 KB | Peer: `react` |
| **Full React Ecosystem** (`react` + `core`) | 76.2 KB | **18.1 KB** | 15.9 KB | Peer: `react` |
| **`@native-form/zod`** | 0.86 KB | **0.43 KB** (445 B) | 386 B | Peer: `zod` |
| **`@native-form/valibot`** | 0.90 KB | **0.45 KB** (457 B) | 406 B | Peer: `valibot` |
| **`@native-form/yup`** | 1.02 KB | **0.51 KB** (519 B) | 445 B | Peer: `yup` |

- **Zero dependencies**: `@native-form/core` runs purely on browser standards (`FormData`, `MutationObserver`, `EventTarget`).
- **Fully Tree-shakeable**: Import only the hooks (`useForm`, `useField`, `useWatch`, `useWizard`) your view requires.
- **Microscopic Schema Adapters**: Adapters add under **500 bytes** to your production bundle.

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
import { useForm, useField } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  age: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
});

export function LoginForm() {
  const { formRef, formState } = useForm({
    schema: zodResolver(schema),
    serializationMode: "typed",
    onSubmit: (values) => console.log("Validated:", values),
  });

  return (
    <form ref={formRef} noValidate>
      <input name="email" type="email" placeholder="Email" />
      <input name="age" type="number" placeholder="Age" />

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

## Monorepo Packages

* **[`packages/core`](packages/core/README.md)**: Core framework-agnostic runtime and DOM observer.
* **[`packages/react`](packages/react/README.md)**: React bindings and hooks (`useForm`, `useField`, `useWatch`, `useFieldArray`, `useWizard`).
* **[`packages/zod`](packages/zod/README.md)**: Zod validation adapter (`zodResolver`).
* **[`packages/yup`](packages/yup/README.md)**: Yup validation adapter (`yupResolver`).
* **[`packages/valibot`](packages/valibot/README.md)**: Valibot validation adapter (`valibotResolver`).

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
