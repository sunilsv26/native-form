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

## Current State (2026-07-09)

- Core runtime contracts are stable and tested.
- Browser edge-case coverage and async cancellation semantics are implemented.
- React package exists but needs dedicated integration tests.
- Zod adapter exists with tests.
- Release automation is intentionally deferred in favor of developer and product fit work.

## Milestone v0.1 (Foundation)

Outcome:

- Stable runtime behavior and contract safety.

Status:

- Completed: NF-001, NF-002, NF-003, NF-004, NF-005.
- Operational publish setup can resume later.

## Milestone v0.4 (Adoption Readiness)

Primary outcome:

- Teams can adopt Native Form in real applications without custom glue.

Scope:

1. React adapter reliability

- Add React integration tests for Form/useForm/useField lifecycle and error propagation.
- Validate behavior under rerenders and async validation overlap.

2. Adapter ecosystem expansion

- Add @native-form/yup adapter.
- Add shared adapter contract tests across zod and yup.

3. Adoption docs

- Add migration guide from RHF/Formik mental models.
- Add practical positioning guidance and examples.

Success metrics:

- React integration test suite exists and is green in CI.
- Zod and yup examples both work with matching field-name semantics.
- Contract tests enforce consistent adapter behavior.

## Milestone v0.5 (Ergonomics)

Primary outcome:

- RHF-like productivity for common form workflows without registration APIs.

Scope:

1. Field array ergonomics

- Build ergonomic add/remove/reorder helpers while preserving name-based model.

2. Watch and selector ergonomics

- Add lightweight selective subscriptions for form and field slices.

Success metrics:

- Complex nested+array forms are practical without controlled components.
- Ergonomic APIs reduce boilerplate while preserving DOM-first architecture.

## Risks and Mitigations

Risk: scope creep into controlled-component patterns.

- Mitigation: preserve review guardrails in docs/ISSUE_BACKLOG.md and docs/DESIGN.md.

Risk: adapter inconsistency.

- Mitigation: shared adapter contract test matrix.

Risk: React adapter regressions.

- Mitigation: require React integration tests before shipping new ergonomics APIs.
