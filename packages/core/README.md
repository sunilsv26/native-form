# @native-form/core

Framework-agnostic, zero-registration native HTML-first form runtime and validation engine.

[![npm version](https://img.shields.io/npm/v/@native-form/core.svg)](https://www.npmjs.com/package/@native-form/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

`@native-form/core` provides a headless, DOM-first runtime that works seamlessly across **any JavaScript environment** — including Vanilla JS, Vue.js, Svelte, Angular, Solid, or custom web components.

---

## Features

- **Zero Manual Registration**: Form controls are discovered automatically from the DOM via their standard `name` attributes.
- **Fast MutationObserver Sync**: Automatically detects dynamic field additions, removals, and DOM order changes without manual bindings.
- **Typed & Native Serialization**: Extract raw string/FormData values or automatically coerce controls to typed numbers, booleans, and arrays.
- **Nested Object Paths**: Built-in support for dot notation (`user.email`) and bracket notation (`items[0].name`).
- **Async Validation Pipeline**: Debounced validation with automatic `AbortController` cancellation for stale in-flight requests.
- **Multi-Step Memory Hydration**: Optional `preserveUnmountedValues: true` caches values when form steps are swapped or unmounted.

---

## Installation

```bash
npm install @native-form/core
# or
pnpm add @native-form/core
# or
yarn add @native-form/core
```

---

## Cross-Platform Usage Examples

### 1. Plain Vanilla JS / HTML

No framework required. Attach `Runtime` directly to any native HTML form:

```html
<!-- index.html -->
<form id="contact-form">
  <input name="email" type="email" required />
  <input name="age" type="number" min="18" />
  <button type="submit">Submit</button>
</form>
```

```ts
// main.ts
import { Runtime } from "@native-form/core";

const formEl = document.getElementById("contact-form") as HTMLFormElement;

const runtime = new Runtime({
  mode: "onBlur",
  serializationMode: "typed", // automatically converts age to a number!
  onSubmit: (values) => {
    console.log("Submitted typed values:", values);
  },
  onInvalid: (errors) => {
    console.warn("Validation failed:", errors);
  },
});

// Start observing and managing the form
runtime.mount(formEl);

// Cleanup when navigating away or unmounting
// runtime.unmount();
```

---

### 2. Vue.js (Vue 3 `<script setup>`)

Attach `@native-form/core` to a Vue template ref inside `onMounted`:

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
      serializationMode: "typed",
      onSubmit: (values) => {
        console.log("Vue form submitted:", values);
      },
    });
    runtime.mount(formRef.value);
  }
});

onUnmounted(() => {
  runtime?.unmount();
});
</script>

<template>
  <form ref="formRef" novalidate>
    <label>
      Email:
      <input name="email" type="email" required />
    </label>

    <label>
      Password:
      <input name="password" type="password" minlength="8" required />
    </label>

    <button type="submit">Log In</button>
  </form>
</template>
```

---

### 3. Svelte (Svelte 4 & 5)

Attach `@native-form/core` via Svelte's `onMount` or action directive:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Runtime } from "@native-form/core";

  let formEl: HTMLFormElement;
  let runtime: Runtime;

  onMount(() => {
    runtime = new Runtime({
      mode: "onChange",
      serializationMode: "typed",
      onSubmit: (values) => {
        console.log("Svelte form values:", values);
      },
    });
    runtime.mount(formEl);
  });

  onDestroy(() => {
    runtime?.unmount();
  });
</script>

<form bind:this={formEl} novalidate>
  <input name="username" type="text" required />
  <input name="age" type="number" min="18" />
  <button type="submit">Sign Up</button>
</form>
```

---

## Configuration Options

When instantiating `new Runtime(options)`, the following options are available:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `"onSubmit" \| "onBlur" \| "onChange" \| "onTouched" \| "all"` | `"onSubmit"` | Validation trigger strategy. |
| `serializationMode` | `"native" \| "typed"` | `"native"` | Whether values are serialized as raw strings/FormData or coerced typed values (numbers, booleans). |
| `nesting` | `"flat" \| "nested"` | `"flat"` | Whether dot/bracket notation paths are converted into deep nested objects (e.g. `user.email` -> `{ user: { email } }`). |
| `preserveUnmountedValues` | `boolean` | `false` | When true, caches values from fields that unmount from the DOM (e.g. multi-step wizard views). |
| `debounceMs` | `number` | `300` | Debounce delay for async field validators. |
| `asyncValidators` | `Record<string, AsyncValidator>` | `undefined` | Key-value mapping of field names to asynchronous validation functions with `AbortSignal` cancellation. |
| `schema` | `SchemaLike` | `undefined` | Schema adapter (e.g. from `@native-form/zod`, `@native-form/yup`, `@native-form/valibot`). |
| `onSubmit` | `(values, event?) => void` | `undefined` | Callback invoked when submission succeeds and passes validation. |
| `onInvalid` | `(errors, values, event?) => void` | `undefined` | Callback invoked when submission is blocked due to validation failures. |

---

## Schema Adapters

Native Form provides plug-and-play schema validation packages for popular libraries:

* [`@native-form/zod`](https://www.npmjs.com/package/@native-form/zod) — Zod adapter
* [`@native-form/yup`](https://www.npmjs.com/package/@native-form/yup) — Yup adapter
* [`@native-form/valibot`](https://www.npmjs.com/package/@native-form/valibot) — Valibot adapter

```ts
import { Runtime } from "@native-form/core";
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const runtime = new Runtime({
  schema: zodResolver(
    z.object({
      email: z.string().email(),
      age: z.number().min(18),
    })
  ),
});
```

---

## React Integration

For React applications, use the official React package [`@native-form/react`](https://www.npmjs.com/package/@native-form/react) which provides hooks (`useForm`, `useField`, `useWatch`, `useFieldArray`, `useWizard`).

---

## License

MIT © [Sunil](https://github.com/sunilsv26)
