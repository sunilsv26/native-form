# Native Form Roadmap

This roadmap focuses on product adoption before release automation.

## Product Goal

Ship a production-ready npm form library with:

- zero field registration
- native HTML-first behavior
- schema adapters (zod, yup, and additional adapters over time)
- React ergonomics comparable to React Hook Form for common workflows

## Non-Goals

- Controlled-component-first architecture
- Mandatory controller wrappers
- Premature plugin framework work before adoption ergonomics are stable

## Principles

- Native HTML first
- Runtime-driven state from DOM
- Headless and UI-library agnostic
- Deterministic lifecycle and validation behavior
- Backward-safe public API evolution

## Current State

- Core runtime contracts are stable, hardened, and verified with 146 unit & integration tests.
- Browser edge-case coverage and async cancellation semantics are implemented.
- Schema adapters for Zod and Yup are production-ready and validated with a shared contract matrix.
- Field array lifecycle stability and path utilities (`formPath`, `arrayItemPath`, `splitPath`, `parseArrayItemPath`, `shiftArrayItemIndex`, `remapArrayItemIndex`) are implemented and tested.
- React watch and selector ergonomics (`useWatch`, `useField` selector, `useForm` selector/mode) provide targeted subscriptions with isolated renders.
- Full verification pipeline (`pnpm verify` & `api:extract`) passes with 0 errors and 0 warnings.

## Milestone v0.1 (Foundation)

Outcome:

- Stable runtime behavior and contract safety.

Status:

- Completed: NF-001, NF-002, NF-003, NF-004, NF-005.

## Milestone v0.4 (Adoption Readiness)

Primary outcome:

- Teams can adopt Native Form in real applications without custom glue.

Scope:

1. React adapter reliability
- React integration tests for Form/useForm/useField lifecycle and error propagation.
- Verified behavior under rerenders and async validation overlap.

2. Adapter ecosystem expansion
- Added `@native-form/yup` adapter (`yupResolver`).
- Shared adapter contract tests across zod and yup (`@native-form/adapter-contracts`).

3. Adoption docs
- Migration guide from RHF/Formik mental models (`docs/MIGRATION_RHF.md`).
- Positioning guidance, quick-starts, and Vite example app.

Status:

- Completed: NF-013, NF-014, NF-015, NF-016.

## Milestone v0.5 (Ergonomics)

Primary outcome:

- RHF-like productivity for common form workflows without registration APIs.

Scope:

1. Field array ergonomics
- Ergonomic add/remove/reorder helpers while preserving name-based model.
- Dynamic field addition/removal/re-indexing lifecycle stability.

2. Watch and selector ergonomics
- Lightweight selective subscriptions for form and field slices (`useWatch`, `useField` selector, `useForm` selector).
- Zero-dependency `shallowEqual` for structural selector comparison.

Status:

- Completed: NF-017, NF-018.

## Next Milestones

### Milestone v0.6 (Release Packaging & Distribution)

- Clean API extractor report and doc models.
- Version bump and changelog preparation across workspace packages.
- CI/CD publish automation and npm distribution.

### Milestone v0.7 (Extensibility RFCs)

- [x] NF-011: Plugin and middleware design RFC around runtime pipeline hooks (serialize -> validate -> render -> emit) ([RFC 001](rfcs/RFC_001_PLUGINS_AND_MIDDLEWARE.md)).
- [x] NF-012: Serializer evolution investigation (element-level serializers) ([RFC 002](rfcs/RFC_002_SERIALIZER_EVOLUTION.md)).
- Additional schema adapters (Valibot, ArkType).

## Risks and Mitigations

Risk: scope creep into controlled-component patterns.

- Mitigation: preserve review guardrails in docs/ISSUE_BACKLOG.md and docs/DESIGN.md.

Risk: adapter inconsistency.

- Mitigation: shared adapter contract test matrix.

Risk: React adapter regressions.

- Mitigation: require React integration tests before shipping new ergonomics APIs.
