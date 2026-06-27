# Public API Reference

This document defines the supported public surface of native-form packages.

## @native-form/core

Runtime:

- Runtime
- RuntimeOptions
- RuntimeFormState
- RuntimePublicApi

Validation:

- ValidationIssue
- ValidationResult
- ValidationContext
- Validator
- SchemaLike
- StandardSchemaIssue
- StandardSchemaResult
- StandardSchemaV1
- InferSchemaOutput
- createValidator

Validation Pipeline:

- ValidationFieldMeta
- ValidationPipelineContext
- ValidationPipelineCapabilities
- ValidationPipeline
- ValidationPipelineOptions
- createValidationPipeline

Path helpers:

- FieldPathSegment
- formPath
- arrayItemPath

State and events:

- FieldState
- NativeFormValue
- NativeFormFlatValues
- NativeFormNestedValue
- NativeFormValues
- RuntimeEventType
- RuntimeEvent
- RuntimeListener

Not public from core barrel:

- Discovery
- FieldNode
- FieldRegistry
- Serializer
- FieldErrorRenderer

## @native-form/react

- Form
- FormProps
- useForm
- UseFormOptions
- UseFormResult
- useField
- UseFieldOptions
- UseFieldResult

## @native-form/zod

- zodResolver

## Stability Policy

- Public API additions/removals are breaking unless explicitly approved.
- Runtime and barrel API contract tests must be updated in the same PR as intentional API changes.
