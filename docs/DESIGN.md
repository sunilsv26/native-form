# Native Form Design Specification

This document defines stable responsibilities for core modules and acts as architecture policy for maintainers.

## Scope

- Core runtime architecture in packages/core.
- Responsibility boundaries between orchestration, state, validation, and rendering collaborators.
- Maintainer rules to preserve long-term clarity.

## Runtime

Purpose:

- Coordinates lifecycle for one HTMLFormElement.

Owns:

- Discovery orchestration and field sync.
- Subscription and event emission.
- Validation invocation and cancellation boundaries.
- Aggregate form state projection.

Does not own:

- Validation logic implementation.
- Serialization logic implementation.
- Field-local state transitions.
- DOM error rendering details.

Collaborators:

- Discovery
- FieldRegistry
- Serializer
- ValidationPipeline
- FieldErrorRenderer

## Discovery

Purpose:

- Finds named form controls from the DOM.

Owns:

- Discovery strategy over HTMLFormElement.

Does not own:

- Field state.
- Validation.
- Rendering.

## FieldRegistry

Purpose:

- Indexes FieldNode instances and emits mount or unmount change notifications.

Owns:

- Registration and lookup by field name.

Does not own:

- Validation.
- Serialization.
- Error DOM lifecycle.

## FieldNode

Purpose:

- Encapsulates state and transitions for exactly one field.

Owns:

- Field-local state: dirty, touched, mounted, initial value, current value, error.
- Field-local lifecycle handlers.

Does not own:

- Cross-field coordination.
- Validation strategy.
- DOM error rendering.
- Runtime lifecycle orchestration.

Maintainer rule:

- FieldNode can know everything about one field, but it must not coordinate other concerns.

## Serializer

Purpose:

- Converts FormData into flat value snapshots keyed by field name.

Owns:

- Native form data extraction and normalization.

Does not own:

- Validation.
- Runtime events.

## Validation and Pipeline

Purpose:

- Validate full snapshots through a stable contract, independently of runtime orchestration.

Owns:

- ValidationResult and ValidationIssue contract.
- Pipeline capability declaration for field-scoped validation.
- Adapter integration for schema validators.

Does not own:

- Runtime lifecycle.
- UI rendering.

Policy:

- Validators should primarily depend on values and validation context contracts.
- DOM-centric behavior must stay optional and isolated.

## FieldErrorRenderer

Purpose:

- Applies and clears field-level error projection in the DOM and native validity surface.

Owns:

- Error node creation and cleanup.
- Native validity message application.

Does not own:

- Validation decisions.
- Runtime flow control.

## Public API Stability Policy

Runtime public surface is treated as frozen for this phase.

Public Runtime methods and properties:

- mount
- unmount
- serialize
- validate
- submit
- subscribe
- unsubscribe
- getFieldState
- getFieldStates
- getFormState
- fields

Policy:

- New Runtime surface is a breaking change unless explicitly approved and documented.

## Design Change Checklist

Before merging architecture changes:

- Responsibility section in this file is updated.
- Runtime lifecycle contract remains valid.
- Contract tests are updated.
- Module docs stay in sync.

Related docs:

- docs/architecture.md
- docs/RUNTIME.md
- docs/FIELDNODE.md
- docs/VALIDATION.md
- docs/LIFECYCLE.md
