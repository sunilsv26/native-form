# Runtime Module

Runtime is the core orchestrator in @native-form/core.

It owns form lifecycle wiring, discovery sync, serialization snapshots, validation execution, and event emission.

Source: packages/core/src/Runtime.ts

## Responsibilities

- Mount and unmount runtime behavior to a native form.
- Keep discovered fields synchronized with DOM mutations.
- Serialize current form values from the DOM.
- Run full-form and field-triggered validation through ValidationPipeline.
- Apply runtime error state and field-level error presentation via FieldErrorRenderer.
- Emit lifecycle and validation events to subscribers.
- Expose aggregate form state for adapters.

## Public API (frozen)

- mount(form)
- unmount()
- serialize()
- validate()
- submit(event?)
- subscribe(listener)
- unsubscribe(listener)
- getFieldState(name)
- getFieldStates()
- getFormState()
- fields (readonly list)

Contract type: RuntimePublicApi in packages/core/src/Runtime.ts.

## Lifecycle Model

1. mount

- Discover controls and register FieldNode state.
- Normalize error label surface.
- Attach DOM listeners and mutation observer.
- Emit form:mount (after field:mount events from discovery/registry).

2. field events

- input/change updates FieldNode state.
- blur marks touched.
- reset rehydrates initial values and clears errors.
- submit marks all fields touched before validation.

3. validation

- Runtime chooses validateField or validate depending on pipeline capabilities.
- Emits validation:start and validation:end around active validation.
- On invalid submit, emits form:invalid and skips form:submit.

4. unmount

- Remove listeners and observer.
- Abort inflight validation.
- Clear projected runtime errors.
- Unregister all fields and emit form:unmount.

## Event Contract

Primary event stream is RuntimeEvent from packages/core/src/types.ts.

Common ordering expectations are enforced in tests:

- input/change path:
  - validation:start
  - field:input or field:change
  - field:update
  - validation:end

- invalid submit path:
  - field:submit (for each field)
  - validation:start
  - validation:end
  - form:invalid

- valid submit path:
  - field:submit (for each field)
  - validation:start
  - validation:end
  - form:submit

## State Surface

RuntimeFormState includes:

- dirty
- touched
- valid
- submitting
- validating
- errors
- fields
- values

Boundary guarantees:

- submitting is true only while onSubmit is in flight.
- validating is true only while active validation is in flight.

## Related Modules

- Field nodes: docs/FIELDNODE.md
- Validation contracts and pipeline: docs/VALIDATION.md
- Architecture overview: docs/architecture.md
