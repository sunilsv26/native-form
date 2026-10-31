# Native Form

> **The Zero-Boilerplate, Zero-Re-Render Form Engine for Modern Web Apps.**

[![npm version](https://img.shields.io/npm/v/@native-form/core.svg?style=flat&color=0284c7)](https://www.npmjs.com/package/@native-form/core)
[![npm downloads](https://img.shields.io/npm/dw/@native-form/core.svg?style=flat&color=10b981)](https://www.npmjs.com/package/@native-form/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tests: 289 Passing](https://img.shields.io/badge/tests-289%20passing-success.svg)](https://github.com/sunilsv26/native-form)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178c6.svg)](https://github.com/sunilsv26/native-form)
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/sunilsv26/native-form)

Traditional React form libraries force you to wrap every single field in state hooks or registration spreads (`{...register('email')}`) and custom `<Controller>` wrappers. 

**Native Form** flips the paradigm: it treats the browser's native HTML5 DOM as the single source of truth. Form controls are automatically discovered via standard `name` attributes using `MutationObserver`, giving you **zero keystroke re-renders**, pure HTML JSX, and automatic typed schema validation.

---

## ⚡️ Try It In 5 Seconds

Test the zero-re-render playground directly in your browser without cloning or installing anything:

👉 **[Launch 1-Click Interactive Playground on StackBlitz](https://stackblitz.com/github/sunilsv26/native-form)**

---

## 🥊 The Difference: React Hook Form vs Native Form

| React Hook Form / Formik | Native Form (This Library) |
| :--- | :--- |
| ❌ Manually spread `{...register("email")}` on every input | ✅ Standard HTML: `<input name="email" />` |
| ❌ Need `<Controller>` wrappers for custom UI components | ✅ Works directly on native DOM elements |
| ❌ Keystrokes trigger React component render cycles | ✅ **0 virtual DOM re-renders** while typing |
| ❌ Manual parsing for typed numbers and booleans | ✅ Auto-coerces `type="number"` and checkboxes |
| ❌ Complex form contexts for multi-step wizards | ✅ Built-in memory hydration across unmounted steps |

```tsx
// ❌ Traditional React Form Libraries (Boilerplate-heavy)
<input {...register("user.email", { required: true })} />
<Controller name="age" control={control} render={({ field }) => <input {...field} />} />

// ✅ Native Form (Clean, standard HTML)
<input name="user.email" type="email" required />
<input name="user.age" type="number" />
```

---

## 🌐 Cross-Platform Modular Architecture

Native Form is decoupled into lightweight, composable packages. Use the framework-agnostic core in Vanilla JS, Svelte, or Vue, or use the React hooks adapter:

```
                       ┌───────────────────────┐
                       │   @native-form/core   │ (Vanilla JS, Svelte, Vue, Custom Elements)
                       └───────────┬───────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌─────────────────────┐ ┌───────────────┐ ┌────────────────────┐
   │  @native-form/react │ │ Schema Adapters│ │ Framework Adapters │
   │ (React 18 & 19 Hooks│ │ (Zod/Yup/Vali)│ │   (Vue / Svelte)   │
   └─────────────────────┘ └───────────────┘ └────────────────────┘
```

| Package | Purpose | Install Command |
| :--- | :--- | :--- |
| **[`@native-form/react`](packages/react/README.md)** | Idiomatic React 18 & 19 hooks (`useForm`, `useField`, `useWizard`) | `npm i @native-form/react` |
| **[`@native-form/core`](packages/core/README.md)** | Headless, framework-agnostic core DOM runtime & serializer | `npm i @native-form/core` |
| **[`@native-form/zod`](packages/zod/README.md)** | Ultra-lightweight (~250B) Zod schema resolver | `npm i @native-form/zod zod` |
| **[`@native-form/valibot`](packages/valibot/README.md)** | Ultra-lightweight (~540B) Valibot schema resolver | `npm i @native-form/valibot valibot` |
| **[`@native-form/yup`](packages/yup/README.md)** | Ultra-lightweight (~250B) Yup schema resolver | `npm i @native-form/yup yup` |

---

## 🚀 Quick Start (React + Zod)

### 1. Install

```bash
npm install @native-form/react @native-form/zod zod
```

### 2. Write Your Form

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
    serializationMode: "typed", // Automatically coerces type="number" to JS numbers
    onSubmit: (values) => console.log("Validated JSON:", values),
  });

  return (
    <form ref={formRef} noValidate>
      <div>
        <label>Email</label>
        <input name="email" type="email" placeholder="jane@example.com" />
        {formState.errors.email && <p style={{ color: "red" }}>{formState.errors.email}</p>}
      </div>

      <div>
        <label>Age</label>
        <input name="age" type="number" placeholder="25" />
        {formState.errors.age && <p style={{ color: "red" }}>{formState.errors.age}</p>}
      </div>

      <button type="submit" disabled={formState.submitting}>
        {formState.submitting ? "Validating..." : "Submit"}
      </button>
    </form>
  );
}
```

---

## ⚡️ Next.js (App Router & Server Actions)

Native Form is 100% compatible with Next.js App Router, SSR, and Server Actions. Just add `'use client'` at the top:

```tsx
'use client';

import { useForm } from "@native-form/react";
import { zodResolver } from "@native-form/zod";
import { loginAction } from "@/app/actions";
import { loginSchema } from "@/app/schemas";

export default function LoginPage() {
  const { formRef, formState } = useForm({
    schema: zodResolver(loginSchema),
    onSubmit: async (values) => {
      // Pass typed, validated values directly into your Server Action
      await loginAction(values);
    },
  });

  return (
    <form ref={formRef}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button type="submit" disabled={formState.submitting}>Sign In</button>
    </form>
  );
}
```

---

## 📊 Feature & Conformance Matrix

| Capability | Native Form | React Hook Form | Formik |
| :--- | :---: | :---: | :---: |
| **0 Keystroke Re-renders** | ✅ **Yes (DOM-first)** | ⚠️ Partial (`mode: onSubmit`) | ❌ No (Renders on change) |
| **Zero Field Registration** | ✅ **Automatic (DOM discovery)** | ❌ No (`{...register()}`) | ❌ No (`getFieldProps()`) |
| **React 18 & 19 StrictMode Safe** | ✅ **Yes (Verified idempotency)** | ✅ Yes | ⚠️ Legacy warnings |
| **Next.js SSR Hydration Safe** | ✅ **Yes (Zero mismatches)** | ✅ Yes | ⚠️ Component mismatches |
| **Multi-Step Memory Preservation** | ✅ **Built-in (`preserveUnmountedValues`)** | ❌ Requires custom state | ❌ Requires custom state |
| **Framework Agnostic Core** | ✅ **Yes (Vue, Svelte, Vanilla)** | ❌ React only | ❌ React only |
| **Automatic Number/Bool Coercion** | ✅ **Yes (`typed` mode)** | ❌ No (returns strings) | ❌ No (manual parse) |

---

## 🤝 Contributing & Community

Contributions, issues, and feature requests are welcome!

- **Report a Bug or Request a Feature**: Open an issue on [GitHub Issues](https://github.com/sunilsv26/native-form/issues)
- **Contribution Guide**: Read our [CONTRIBUTING.md](docs/CONTRIBUTING.md) to set up the local monorepo and run tests.

---

## 📄 License

MIT © [Sunil S V](https://github.com/sunilsv26)
