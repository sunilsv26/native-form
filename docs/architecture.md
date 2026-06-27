# Native Form Architecture

> Native HTML first. Headless by default. Zero registration.

Contributor workflow and checklists: see `docs/CONTRIBUTING.md`.

---

# Vision

Modern React form libraries require developers to teach the library about every field.

Examples:

- register("email")
- Controller
- <Field>
- useField

Native Form takes a different approach.

The browser already knows every form control.

Instead of registering fields manually, Native Form discovers them automatically using the DOM.

Developers should write HTML first.

```tsx
<Form onSubmit={console.log}>
  <input name="email" />
  <input name="password" />
  <button>Submit</button>
</Form>
```

No registration.

No controllers.

No field wrappers.

---

# Core Principles

## 1. Native HTML First

HTML forms already solve:

- focus
- keyboard navigation
- accessibility
- FormData
- browser validation
- autofill
- password managers

The library should extend browser capabilities instead of replacing them.

---

## 2. Zero Registration

Every named control inside a form is automatically discovered.

```html
<input name="email" />
```

is enough.

No

```tsx
register("email");
```

ever.

---

## 3. Headless by Default

Native Form owns no UI.

It exposes behavior only.

Users remain free to use:

- Native HTML
- MUI
- Chakra
- Radix
- Shadcn
- Tailwind
- Any design system

---

## 4. Runtime Driven

The browser is the source of truth.

React state is not.

```
DOM
 ↓
Runtime
 ↓
Subscribers
```

Runtime observes the form.

React consumes Runtime.

Never the other way around.

---

## 5. Progressive Enhancement

The library should continue working with standard HTML semantics.

Forms should still submit correctly if JavaScript enhancements are removed.

---

# Current Architecture

```
Browser

        │

        ▼

HTMLFormElement

        │

        ▼

Runtime

 ┌──────┼─────────┐

 ▼      ▼         ▼

Discovery Registry Serializer

```

Current responsibilities:

## Discovery

Find every form control.

Input:

```
HTMLFormElement
```

Output:

```
FieldNode[]
```

---

## Registry

Stores discovered fields.

Provides lookup.

```
registry.get("email")
```

---

## Serializer

Converts browser FormData into JavaScript values.

```
FormData

↓

Object
```

---

## Runtime

Coordinates everything.

Responsibilities:

- mount
- unmount
- discover
- serialize

Future:

- subscriptions
- validation
- dirty tracking
- touched tracking

---

# Public API

Current

```tsx
<Form onSubmit={(values) => {}}>
  <input name="email" />
</Form>
```

Future

```tsx
const form = useForm();

const email = useField("email");
```

These APIs should remain optional.

The HTML API must always remain first-class.

---

# Why Runtime Instead of React State?

React state duplicates browser state.

```
DOM

↓

React State

↓

Library State

↓

Validation State
```

Native Form removes unnecessary layers.

```
DOM

↓

Runtime
```

One source of truth.

---

# Event Flow (Next Milestone)

```
User types

↓

Browser

↓

Runtime

↓

Emitter

↓

Subscribers

↓

React
```

Everything builds on subscriptions.

Examples:

Validation

```
change

↓

validate
```

Dirty State

```
change

↓

dirty
```

Watch

```
change

↓

subscriber
```

Plugins

```
Runtime

↓

events

↓

plugin
```

## Event-Order Contract

For a single field interaction sequence, Runtime emits deterministic lifecycle events in this order:

```text
field:mount
field:input
field:update
field:change
field:update
field:blur
field:reset
field:submit
field:unmount
```

Specific events (`field:input`, `field:change`) describe source actions.
`field:update` is the generic value-change signal and may follow specific input/change events.

## Validation Pipeline Contract

Runtime delegates validation to a pipeline contract rather than owning validation logic.

```text
Runtime
  ↓
ValidationPipeline.validate(values, { form, signal, fields })
  ↓
ValidationResult
```

Contract rules:

- Runtime never performs schema-specific validation itself.
- Pipeline receives abort signal and field context.
- Validation precedence is explicit and deterministic:
  1. Injected `pipeline` option
  2. `schema` option
  3. `validator` option
  4. Native browser validity fallback
- Pipeline entrypoints:
  - `validate(values, context)` is used for full-form validation (e.g. submit).
  - `validateField(field, values, context)` is used for field-triggered validation (e.g. input/change).
- Pipeline capabilities:
  - `supportsFieldScopedValidation: true` means Runtime will call `validateField(...)` for input/change validation.
  - `supportsFieldScopedValidation: false` means Runtime will fall back to `validate(...)` even for input/change.
  - If omitted, Runtime treats capability as `true` for backward compatibility.
- Default pipeline behavior:
  - Native mode validates only the active field in `validateField`.
  - Schema/validator mode currently validates the full snapshot even from `validateField`.
- Without schema/validator/pipeline, default pipeline uses native browser validity.

Example custom pipeline:

```ts
const pipeline = {
  capabilities: {
    supportsFieldScopedValidation: false,
  },
  async validate(values, context) {
    // full-form validation path
    return { success: true, values };
  },
  async validateField(field, values, context) {
    // optional field-triggered path
    return { success: true, values };
  },
};
```

Future direction:

- Add optional true field-scoped schema validation where supported by adapters.
- Keep full-snapshot validation as the compatibility baseline.

---

# Package Layout

```
packages/

core/

react/

zod/

examples/
```

## @native-form/core

Framework independent.

Contains:

- Runtime
- Discovery
- Registry
- Serializer

No React imports.

---

## @native-form/react

React adapter.

Contains:

- Form
- Hooks
- Context

No business logic.

---

## @native-form/zod

Validation adapter.

Contains only schema integration.

---

# Stabilization Notes

Recent core stabilization changes introduced explicit contracts:

- `FieldNode` is the single source of truth for per-field state (`mounted`, `dirty`, `touched`, `value`, `error`).
- Runtime emits deterministic field lifecycle events (see Event-Order Contract).
- Validation moved behind `ValidationPipeline`.
- Pipeline invocation precedence is explicit: `pipeline` > `schema` > `validator` > native.
- Pipeline capabilities now declare field-scoped support:
  - `supportsFieldScopedValidation: true` -> Runtime uses `validateField` for input/change.
  - `supportsFieldScopedValidation: false` -> Runtime uses `validate` for input/change.

These contracts are covered by unit tests in `packages/core/test`.

---

# Non Goals

Native Form is not trying to replace HTML.

Native Form is not a UI library.

Native Form is not a component library.

Native Form is not tied to React.

---

# Roadmap

## Milestone 1 ✅

- Monorepo
- Runtime
- Discovery
- Serializer
- React Form

---

## Milestone 2 ✅

- Event Emitter
- Runtime subscriptions

---

## Milestone 3 ✅

- useForm()
- useField()

---

## Milestone 4

- Validation
- Zod adapter

---

## Milestone 5

- Nested objects
- Arrays

---

## Milestone 6

- Dynamic fields
- MutationObserver

---

## Milestone 7

- Controlled component adapter

---

# Engineering Principles

- Browser APIs over custom abstractions.
- Composition over configuration.
- Zero-cost abstractions whenever possible.
- Keep the public API small.
- Prefer standards over framework-specific behavior.
- Build features incrementally without breaking existing APIs.

---

# Success Criteria

A developer should be able to build a complete form using only standard HTML.

The library should add capabilities, not complexity.
