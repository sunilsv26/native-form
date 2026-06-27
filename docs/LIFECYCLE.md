# Runtime Lifecycle Contract

This document defines lifecycle transitions for one form runtime instance and the expected effects on field and form state.

## Transition Sequence

Canonical lifecycle path:

mount
input
blur
submit
reset
unmount

Not every user journey includes every step, but semantics per transition are stable.

## Transition Semantics

## mount

Effects:

- Discover named controls and register FieldNode state.
- Initialize initial value snapshots.
- Attach runtime listeners and mutation observer.
- Emit field:mount for discovered fields, then form:mount.

State expectations:

- dirty false for freshly registered fields.
- touched false for freshly registered fields.
- validating false.
- submitting false.

## input

Effects:

- Update active FieldNode value and dirty status.
- Emit field:input and normalized field:update.
- Start validation flow and emit validation:start then validation:end.

State expectations:

- touched does not change solely from input.
- dirty reflects initial vs current value comparison.

## change

Effects:

- Update active FieldNode value and dirty status.
- Emit field:change and normalized field:update.
- Validation behavior follows pipeline capability.

State expectations:

- Same dirty semantics as input.

## blur

Effects:

- Mark field as touched.
- Emit field:blur.

State expectations:

- touched true for active field.

## submit

Effects:

- Mark all fields touched and emit field:submit per field.
- Run full validation flow.
- On failure emit form:invalid and skip form:submit.
- On success emit form:submit and invoke onSubmit.

State expectations:

- submitting true only while onSubmit is in flight.
- validating true only while validation is in flight.

## reset

Effects:

- Rehydrate field state from reset values.
- Clear runtime errors and projected field errors.
- Emit field:reset per field then form:reset.

State expectations:

- dirty false after reset.
- touched false after reset.

## unmount

Effects:

- Remove listeners and observer.
- Abort in-flight validation.
- Clear projected runtime errors.
- Unregister fields and emit form:unmount.

State expectations:

- Runtime no longer serves mounted form operations.

## Event Ordering Guarantees

Common expected sequences:

input path:

- validation:start
- field:input
- field:update
- validation:end

change path:

- validation:start
- field:change
- field:update
- validation:end

invalid submit path:

- field:submit per field
- validation:start
- validation:end
- form:invalid

valid submit path:

- field:submit per field
- validation:start
- validation:end
- form:submit

## Notes on Validation Invocation

- Runtime uses validateField for input and change when pipeline capability supportsFieldScopedValidation is true.
- Runtime falls back to validate for input and change when capability is false.
- Runtime always uses validate for submit flows.

## Related Docs

- docs/RUNTIME.md
- docs/VALIDATION.md
- docs/DESIGN.md
