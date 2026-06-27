# Validation Module

Validation in native-form is contract-first and pipeline-driven.

Sources:

- packages/core/src/Validation.ts
- packages/core/src/ValidationPipeline.ts

## Goals

- Keep runtime validation orchestration framework-agnostic.
- Support both native browser validation and schema/validator adapters.
- Preserve full-form snapshot access for deterministic validation behavior.

## Contracts

Validation primitives (Validation.ts):

- ValidationIssue: name + message.
- ValidationResult<TValues>: discriminated union with success true/false.
- ValidationContext: form + abort signal.
- Validator<TValues>: validate(values, context).
- SchemaLike<TValues>: Validator or StandardSchemaV1.

Type model:

- Runtime passes NativeFormFlatValues (serialized form snapshot keyed by field names).
- Validator output values can be nested NativeFormValues.

## Standard Schema Support

createValidator(schema) adapts StandardSchemaV1 to Validator.

- Success path maps to success true with typed values.
- Error path maps schema issues to ValidationIssue using dotted name paths.

## ValidationPipeline

ValidationPipeline contract has two entry points:

- validate(values, context)
  - Full-form validation, used for submit and fallback modes.

- validateField(field, values, context)
  - Field-triggered validation path (input/change) when supported.

Capabilities:

- supportsFieldScopedValidation
  - true: Runtime uses validateField for input/change.
  - false: Runtime uses validate for input/change.

Default createValidationPipeline behavior:

- Without schema/validator:
  - validate uses native browser validation across all fields.
  - validateField uses native browser validation for the active field.
  - capability is true.

- With schema/validator:
  - both validate and validateField delegate to validator.validate(values, context).
  - capability is false.

## Runtime Integration Rules

- Runtime emits validation:start before invoking pipeline.
- Runtime emits validation:end after applying result when not aborted.
- Latest validation wins via AbortController cancellation.
- Errors are normalized to field-name keyed map and projected to UI by Runtime + FieldErrorRenderer.

## Related Modules

- Runtime orchestration: docs/RUNTIME.md
- Field state lifecycle: docs/FIELDNODE.md
- Architecture overview: docs/architecture.md
