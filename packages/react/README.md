# @native-form/react

React hooks and components for Native Form — native HTML-first forms with zero manual registration.

[![npm version](https://img.shields.io/npm/v/@native-form/react.svg)](https://www.npmjs.com/package/@native-form/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

`@native-form/react` wraps the framework-agnostic `@native-form/core` runtime with React-idiomatic hooks, providing uncontrolled DOM performance without unnecessary re-renders.

---

## Features

- **Lightweight (~9.1 KB gzip standalone)**: Zero external runtime dependencies (only peer dependency on React).
- **No `register()` Boilerplate**: Native `<input>`, `<select>`, and `<textarea>` controls just work via standard `name` attributes.
- **Minimal Re-renders**: Uncontrolled DOM-first inputs mean typing never re-renders your entire form component tree.
- **Granular Subscriptions (`useWatch`)**: Re-render only the specific components that need to react to field changes or validity.
- **Field-Level State (`useField`)**: Track `touched`, `dirty`, `validating`, and `error` states for individual fields.
- **Dynamic Field Arrays (`useFieldArray`)**: Append, prepend, insert, remove, swap, and move array items with automatic DOM synchronization.
- **Multi-Step Wizards (`useWizard`)**: Build multi-step forms with step-level validation gating and memory preservation.
- **React 18 & 19 Ready**: Full compatibility with React 18, React 19, Next.js (App & Pages Router), Remix, and Vite.

---

## Installation

```bash
npm install @native-form/react
# or
pnpm add @native-form/react
# or
yarn add @native-form/react
```

---

## Quick Start

```tsx
import React from "react";
import { useForm, useField } from "@native-form/react";

function InputField({ form, name, label, type = "text" }: { form: any; name: string; label: string; type?: string }) {
  const field = useField({ form, name });

  return (
    <div>
      <label>{label}</label>
      <input name={name} type={type} />
      {field.error && <p style={{ color: "red", margin: "4px 0" }}>{field.error}</p>}
    </div>
  );
}

export function LoginForm() {
  const { formRef, formState } = useForm({
    mode: "onBlur",
    onSubmit: (values) => {
      console.log("Submitted form values:", values);
    },
    onInvalid: (errors) => {
      console.warn("Form validation rejected:", errors);
    },
  });

  return (
    <form ref={formRef} noValidate>
      <InputField name="email" label="Email Address" type="email" />
      <InputField name="password" label="Password" type="password" />

      <button type="submit" disabled={formState.submitting}>
        {formState.submitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

---

## Schema Validation Adapters

Native Form provides dedicated validation adapters for your schema library of choice:

### Zod (`@native-form/zod`)
```bash
npm install @native-form/zod zod
```
```tsx
import { zodResolver } from "@native-form/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  age: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
});

const form = useForm({
  schema: zodResolver(schema),
  serializationMode: "typed", // coerces age to number
  onSubmit: (values) => console.log(values),
});
```

### Yup (`@native-form/yup`)
```bash
npm install @native-form/yup yup
```
```tsx
import { yupResolver } from "@native-form/yup";
import * as yup from "yup";

const schema = yup.object({
  email: yup.string().email().required(),
});

const form = useForm({
  schema: yupResolver(schema),
});
```

### Valibot (`@native-form/valibot`)
```bash
npm install @native-form/valibot valibot
```
```tsx
import { valibotResolver } from "@native-form/valibot";
import * as v from "valibot";

const schema = v.object({
  email: v.pipe(v.string(), v.email()),
});

const form = useForm({
  schema: valibotResolver(schema),
});
```

---

## Advanced Hooks

### Dynamic Arrays (`useFieldArray`)
```tsx
import { useForm, useFieldArray } from "@native-form/react";

export function TeamForm() {
  const form = useForm();
  const teammates = useFieldArray({
    form,
    name: "teammates",
    keyField: "id", // assigns stable unique ids
  });

  return (
    <form ref={form.formRef}>
      {teammates.fields.map((field, idx) => (
        <div key={field.id}>
          <input name={`teammates.${idx}.name`} defaultValue={field.name} />
          <button type="button" onClick={() => teammates.remove(idx)}>Remove</button>
        </div>
      ))}

      <button type="button" onClick={() => teammates.append({ name: "" })}>
        Add Teammate
      </button>
    </form>
  );
}
```

### Multi-Step Wizard (`useWizard`)
```tsx
import { useForm, useWizard } from "@native-form/react";

export function WizardForm() {
  const form = useForm({ preserveUnmountedValues: true });
  const wizard = useWizard({
    form,
    steps: [
      { id: "personal", title: "Personal Info", fields: ["fullName", "email"] },
      { id: "shipping", title: "Shipping Address", fields: ["address", "zipCode"] },
      { id: "confirm", title: "Confirmation" },
    ],
  });

  return (
    <form ref={form.formRef}>
      <p>Step {wizard.currentStep + 1} of {wizard.totalSteps}: {wizard.stepConfig.title}</p>

      {wizard.currentStep === 0 && <input name="fullName" placeholder="Full name" />}
      {wizard.currentStep === 1 && <input name="address" placeholder="Address" />}

      <button type="button" onClick={wizard.prev} disabled={wizard.isFirstStep}>Back</button>
      {!wizard.isLastStep ? (
        <button type="button" onClick={wizard.next}>Next Step</button>
      ) : (
        <button type="submit">Place Order</button>
      )}
    </form>
  );
}
```

---

## Configuration Options (`useForm`)

When invoking `useForm(options)`, the following configuration options are available:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `"onSubmit" \| "onBlur" \| "onChange" \| "onTouched" \| "all"` | `"onSubmit"` | Initial validation trigger strategy. |
| `reValidateMode` | `"onChange" \| "onBlur" \| "onSubmit"` | `"onChange"` | Re-validation strategy for fields with active errors. Automatically re-validates discrete controls (`checkbox`, `radio`, `select`) on change so corrected errors clear immediately. |
| `renderDomErrors` | `boolean` | `false` | Whether to automatically inject native DOM error elements after inputs. Defaults to `false` in React because error messages are rendered declaratively via `formState.errors`. |
| `serializationMode` | `"native" \| "typed"` | `"native"` | Whether values are serialized as raw FormData strings or coerced typed values (numbers, booleans, arrays). |
| `nesting` | `"flat" \| "nested"` | `"flat"` | Whether dot/bracket notation paths are converted into deep nested objects (e.g. `user.email` -> `{ user: { email } }`). |
| `preserveUnmountedValues` | `boolean` | `false` | When `true`, caches values from fields that unmount from the DOM (e.g. multi-step wizards or conditional inputs). |
| `debounceMs` | `number` | `300` | Debounce delay in milliseconds for async field validation. |
| `asyncValidators` | `Record<string, AsyncFieldValidator>` | `undefined` | Mapping of field names to async validator functions with automatic `AbortSignal` cancellation. |
| `schema` | `SchemaLike` | `undefined` | Schema adapter resolver (`zodResolver`, `yupResolver`, `valibotResolver`). |
| `validator` | `Validator` | `undefined` | Custom validator object with a `validate(values, context)` method. |
| `selector` | `(state: RuntimeFormState) => TSelected` | `undefined` | Fine-grained state selector to subscribe only to specific parts of the form state, preventing unnecessary component re-renders. |
| `subscribe` | `boolean` | `true` | When set to `false`, disables automatic component re-renders on state changes for maximum performance. |
| `onSubmit` | `(values, event?) => void \| Promise<void>` | `undefined` | Async/sync callback invoked upon successful, validated form submission. |
| `onInvalid` | `(errors, values, event?) => void` | `undefined` | Callback invoked when submission fails validation. |

### Return Value (`UseFormResult`)

`useForm()` returns an object with the following properties:

```tsx
const {
  formRef,   // React.RefObject<HTMLFormElement | null> - attach to <form ref={formRef}>
  formState, // RuntimeFormState: { valid, submitting, dirty, touched, errors, values }
  runtime,   // Underlying @native-form/core Runtime instance
  watch,     // Field watcher function: watch(), watch("fieldName"), watch(["f1", "f2"])
} = useForm();
```

---

## React 18/19 StrictMode & Next.js SSR Compatibility

### 1. React 18 & 19 StrictMode (Double Mount)
In React 18 and 19 development mode, effects are mounted, unmounted, and remounted immediately to detect resource cleanup issues. `useForm` is fully idempotent:
- **Clean Teardown**: Upon unmount, `runtime.unmount()` removes all DOM event listeners (`submit`, `input`, `change`, `blur`, `reset`), disconnects the internal `MutationObserver`, aborts active validation requests via `AbortController`, and clears all debounce timers.
- **Fresh Reconnection**: On remount, a fresh runtime instance attaches to `formRef.current` and synchronizes with the DOM without duplicate event firing or state corruption.

### 2. Next.js & Remix SSR (Server-Side Rendering)
- **Zero Hydration Mismatch**: In SSR frameworks (Next.js App/Pages Router, Remix, Astro), standard `<form>` and `<input>` elements render directly into pure HTML on the server. `useForm` injects zero virtual DOM wrappers or client-only attributes, ensuring 100% hydration consistency.
- **Synchronous Discovery on Mount**: When the client hydrates and `useLayoutEffect` runs, `Discovery.discover(form)` synchronously indexes all inputs already present in the server-rendered HTML before starting the `MutationObserver` for subsequent dynamic DOM mutations.

---

## License

MIT © [Sunil](https://github.com/sunilsv26)
