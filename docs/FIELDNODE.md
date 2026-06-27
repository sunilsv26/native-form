# FieldNode Module

FieldNode is the per-control state owner in @native-form/core.

Source: packages/core/src/FieldNode.ts

## Responsibilities

- Wrap one native form control element.
- Maintain state for dirty, touched, mounted, initial value, current value, and error.
- Normalize lifecycle updates from runtime-level events.
- Expose stable state snapshots through getState().

## Core State

FieldState shape (packages/core/src/FieldState.ts):

- name
- dirty
- touched
- mounted
- initialValue
- value
- error

FieldNode computes dirty by comparing current value against initialValue.

## Lifecycle Entry Points

- register(initialValue)
  - Initializes or re-initializes state when field is discovered/mounted.

- unregister()
  - Marks field as unmounted.

- handleInput(value)
- handleChange(value)
  - Update current value and dirty status.

- handleBlur()
  - Mark touched.

- handleReset(value)
  - Reset to initial semantics and clear field error.

- handleSubmit()
  - Mark touched during submit lifecycle.

- setError(message)
  - Updates field error state only.

## Non-Responsibilities

FieldNode does not manage DOM error-label rendering directly.

Runtime delegates UI projection to FieldErrorRenderer, preserving FieldNode as a state-centric primitive.

## Interaction Model

- Runtime owns orchestration and calls lifecycle methods on FieldNode.
- FieldNode can notify state changes via optional onChange callback.
- Registry stores and serves FieldNode instances by field name.

## Related Modules

- Runtime orchestration: docs/RUNTIME.md
- Validation contracts and pipeline: docs/VALIDATION.md
- Architecture overview: docs/architecture.md
