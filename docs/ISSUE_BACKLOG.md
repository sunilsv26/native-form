# Native Form Issue Backlog

This backlog converts the architecture review into execution-ready issues.

Execution workflow: [docs/BACKLOG_EXECUTION_PLAN.md](docs/BACKLOG_EXECUTION_PLAN.md)

## Labels

Use these labels consistently:

- area:core-runtime
- area:validation
- area:events
- area:types
- area:docs
- area:tests
- area:mutation-policy
- area:release
- priority:p0
- priority:p1
- priority:p2
- type:refactor
- type:test
- type:docs
- type:feature
- milestone:v0.1
- milestone:v0.2
- milestone:v0.3

## Milestone v0.1 (Release Readiness)

### NF-001 Runtime private flow pipelines

- Type: refactor
- Priority: p0
- Area: core-runtime
- Milestone: v0.1
- Estimate: 3-5 days
- Dependencies: none

Scope:

- Keep Runtime as single orchestrator class.
- Add private flow methods for input, change, submit, reset.
- Standardize flow sequence where applicable: serialize -> validate -> render -> emit.

Acceptance criteria:

- No public Runtime API changes.
- Existing Runtime contract tests remain green.
- Event ordering for current scenarios is unchanged.
- Code paths for input/change/submit/reset are easier to trace.

Out of scope:

- Splitting Runtime into multiple services/classes.
- Introducing plugin or middleware APIs.

---

### NF-002 Runtime event emitter helpers

- Type: refactor
- Priority: p1
- Area: events
- Milestone: v0.1
- Estimate: 1-2 days
- Dependencies: NF-001

Scope:

- Add internal helper methods for field, validation, and form event emission.
- Replace repeated event payload assembly in Runtime.

Acceptance criteria:

- RuntimeEvent payload compatibility preserved.
- No behavior change in event sequencing.
- Runtime readability improves with less repeated emission boilerplate.

---

### NF-003 Split RuntimeEvent union aliases

- Type: refactor
- Priority: p1
- Area: types
- Milestone: v0.1
- Estimate: 0.5-1 day
- Dependencies: none

Scope:

- Introduce FieldEvents, ValidationEvents, and FormEvents aliases.
- Compose RuntimeEvent from these aliases.

Acceptance criteria:

- No behavioral/runtime changes.
- Public type tests and exports contract stay green.
- RuntimeEventType remains compatible.

---

### NF-004 Add browser edge-case tests

- Type: test
- Priority: p0
- Area: tests
- Milestone: v0.1
- Estimate: 3-4 days
- Dependencies: none

Scope:

- Add/expand tests for:
  - checkbox behavior
  - radio behavior
  - select multiple behavior
  - disabled fields
  - dynamic field addition
  - dynamic field removal
  - nested names
  - rapid typing
  - submit during validation

Acceptance criteria:

- Deterministic tests in CI (no flaky timing assumptions).
- Coverage addresses all listed scenarios.
- Existing and new tests pass via pnpm verify.

---

### NF-005 Async validation cancellation semantics

- Type: test
- Priority: p0
- Area: validation
- Milestone: v0.1
- Estimate: 2-3 days
- Dependencies: NF-004

Scope:

- Validate latest-wins behavior with AbortController.
- Ensure aborted validations cannot overwrite latest errors/state.
- Add event-order assertions for overlapping validations.

Acceptance criteria:

- Tests prove cancellation semantics with overlapping input/change flows.
- Runtime validating state transitions are stable and documented.
- No regression in submit path behavior.

---

### NF-006 ValidationPipeline doc cleanup

- Type: docs
- Priority: p2
- Area: docs
- Milestone: v0.1
- Estimate: 0.5-1 day
- Dependencies: none

Scope:

- Move long examples from source comments into docs.
- Keep concise contract-oriented JSDoc in source.

Acceptance criteria:

- Docs contain moved examples and remain accurate.
- Source file commentary is shorter and easier to scan.

---

### NF-007 Mutation ignore abstraction

- Type: refactor
- Priority: p2
- Area: mutation-policy
- Milestone: v0.1
- Estimate: 1 day
- Dependencies: none

Scope:

- Introduce shouldIgnoreMutation helper naming.
- Route current ignore checks through unified helper.

Acceptance criteria:

- Current behavior remains unchanged.
- Tests cover ignore helper behavior and default relevant mutations.

---

### NF-008 v0.1 release readiness checklist

- Type: release
- Priority: p0
- Area: release
- Milestone: v0.1
- Estimate: 1-2 days
- Dependencies: NF-001, NF-004, NF-005

Scope:

- Confirm docs completeness and quick-start validation.
- Run final pnpm verify and capture results.
- Confirm package versions/changelog/release notes.

Acceptance criteria:

- All v0.1 blocking issues closed.
- Release checklist completed.
- Publish candidate validated from clean checkout.

## Milestone v0.2 (Feature Expansion)

### NF-009 Nested path behavior hardening

- Type: feature
- Priority: p1
- Area: validation
- Milestone: v0.2
- Estimate: 3-5 days
- Dependencies: v0.1 release

Scope:

- Strengthen nested object path behavior across validation and serialization boundaries.

Acceptance criteria:

- Stable behavior for user.name and user.address.city patterns.
- Regression tests cover nested update and error mapping.

---

### NF-010 Field arrays foundation

- Type: feature
- Priority: p0
- Area: core-runtime
- Milestone: v0.2
- Estimate: 5-8 days
- Dependencies: NF-009

Scope:

- Add first-class handling for array-like names and lifecycle scenarios.
- Align discovery/serialization/path utilities for array index conventions.

Acceptance criteria:

- Stable behavior for addresses.0.city and addresses.1.city patterns.
- Dynamic add/remove of indexed fields remains correct.
- Tests cover serialization + validation + error rendering for arrays.

## Milestone v0.3 (Extensibility)

### NF-011 Plugin and middleware design RFC

- Type: feature
- Priority: p1
- Area: core-runtime
- Milestone: v0.3
- Estimate: 3-4 days
- Dependencies: v0.2 completion
- Status: Completed (see RFC 001)

Scope:

- Write RFC for plugin/middleware extension points around Runtime private flow hooks.

Acceptance criteria:

- RFC documents goals, API sketch, lifecycle integration, and migration strategy.
- No implementation required in this issue.
- Delivered: [RFC 001: Runtime Extension Points (Plugins & Middleware)](rfcs/RFC_001_PLUGINS_AND_MIDDLEWARE.md).

---

### NF-012 Serializer evolution investigation

- Type: feature
- Priority: p2
- Area: core-runtime
- Milestone: v0.3
- Estimate: 2-3 days
- Dependencies: NF-010
- Status: Completed (see RFC 002)

Scope:

- Evaluate serializeFields(fields) direction while preserving current serialize(form) API compatibility.

Acceptance criteria:

- Design note with tradeoffs and migration path.
- Decision captured with rationale and impact.
- Delivered: [RFC 002: Serializer Evolution (serializeFields vs serialize(form))](rfcs/RFC_002_SERIALIZER_EVOLUTION.md).

## Milestone v0.4 (Adoption Readiness)

### NF-013 React adapter integration test foundation

- Type: test
- Priority: p0
- Area: tests
- Milestone: v0.4
- Estimate: 3-4 days
- Dependencies: NF-005

Scope:

- Add integration tests for Form, useForm, and useField runtime wiring.
- Verify submit success path, invalid path, and lifecycle mount/unmount behavior.
- Verify field error/value/invalid synchronization from runtime formState.

Implementation files:

- packages/react/src/Form.tsx
- packages/react/src/useForm.ts
- packages/react/src/useField.ts
- packages/react/test/Form.test.tsx
- packages/react/test/useForm.test.tsx
- packages/react/test/useField.test.tsx

Acceptance criteria:

- React tests run in workspace test command.
- Tests are deterministic and pass in CI.
- No regression in core runtime contract tests.

---

### NF-014 Yup adapter MVP

- Type: feature
- Priority: p0
- Area: validation
- Milestone: v0.4
- Estimate: 2-3 days
- Dependencies: NF-013

Scope:

- Introduce @native-form/yup adapter package with resolver API similar to zod adapter.
- Map nested and array issue paths to dotted field names.
- Ensure validator output conforms to core ValidationResult contract.

Implementation files:

- packages/yup/package.json
- packages/yup/tsconfig.json
- packages/yup/src/index.ts
- packages/yup/test/yupResolver.test.ts
- pnpm-workspace.yaml

Acceptance criteria:

- Yup resolver returns Validator-compatible behavior.
- Nested and array path behavior is covered by tests.
- Workspace verify remains green.

---

### NF-015 Adapter contract test matrix

- Type: test
- Priority: p1
- Area: validation
- Milestone: v0.4
- Estimate: 2-3 days
- Dependencies: NF-014

Scope:

- Add shared adapter contract test cases and run them for zod and yup adapters.
- Cover path normalization, success typing shape, and failure issue mapping.

Implementation files:

- packages/zod/test/contracts/adapterContract.test.ts
- packages/yup/test/contracts/adapterContract.test.ts
- packages/core/src/validation/Validation.ts

Acceptance criteria:

- Both adapters pass the same contract suite.
- Contract failures clearly identify adapter behavior drift.

---

### NF-016 Migration and positioning docs

- Type: docs
- Priority: p1
- Area: docs
- Milestone: v0.4
- Estimate: 1-2 days
- Dependencies: NF-014

Scope:

- Document migration from React Hook Form and Formik mental models.
- Clarify where Native Form differs and where it matches common workflows.
- Add adapter usage examples for zod and yup.

Implementation files:

- README.md
- docs/ROADMAP.md
- docs/MIGRATION_RHF.md

Acceptance criteria:

- New docs explain no-registration model with concrete migration examples.
- README docs links include roadmap and migration docs.

---

### NF-017 Field array ergonomics layer

- Type: feature
- Priority: p0
- Area: core-runtime
- Milestone: v0.4
- Estimate: 5-8 days
- Dependencies: NF-010
- Status: Completed

Scope:

- Build ergonomic helpers for indexed field workflows on top of existing array path foundation.
- Preserve DOM-first behavior and no-registration model.
- Provide `useFieldArray` hook in `@native-form/react` with append, prepend, insert, remove, swap, move, and replace.
- Keep runtime error maps synchronized on array shifts and removals.

Implementation files:

- packages/core/src/Path.ts
- packages/core/src/runtime/Runtime.ts
- packages/core/test/Path.test.ts
- packages/core/test/Runtime.test.ts
- packages/react/src/useFieldArray.ts
- packages/react/test/useFieldArray.test.tsx

Acceptance criteria:

- Add/remove/reorder indexed fields remains stable for values and errors.
- Validation and error projection remain correct for array paths.

---

### NF-018 Watch and selector ergonomics

- Type: feature
- Priority: p1
- Area: react
- Milestone: v0.4
- Estimate: 3-5 days
- Dependencies: NF-013

Scope:

- Add selective subscription ergonomics for form and field slices.
- Improve developer ergonomics for RHF-like watch use cases without controlled component APIs.

Implementation files:

- packages/react/src/useForm.ts
- packages/react/src/useField.ts
- packages/react/src/index.ts
- packages/react/test/watchSelectors.test.tsx

Acceptance criteria:

- Consumers can subscribe to targeted state slices with deterministic updates.
- No registration or controller-style API introduced.

### NF-019 Valibot adapter MVP

- Type: feature
- Priority: p1
- Area: adapters
- Milestone: v0.5
- Estimate: 2-3 days
- Dependencies: NF-015
- Status: Completed

Scope:

- Add `@native-form/valibot` adapter package implementing `valibotResolver`.
- Support sync and async Valibot schemas via `safeParseAsync`.
- Map dotted and indexed paths to nested structures.
- Pass full `@native-form/adapter-contracts` test matrix.
- Pass React end-to-end form validation tests.

Implementation files:

- packages/valibot/src/index.ts
- packages/valibot/test/public-api.test.ts
- packages/valibot/test/valibotResolver.test.ts
- packages/valibot/test/adapter.contract.test.ts
- packages/react/test/e2e.valibot.test.tsx

---

### NF-020 Async server-side validation pipeline

- Type: feature
- Priority: p1
- Area: core-runtime / validation
- Milestone: v0.5
- Estimate: 2-3 days
- Dependencies: NF-013, NF-019
- Status: Completed (see RFC 004)

Scope:

- Add debounced input validation (`debounceMs`).
- Add per-field `validating` state in `FieldState`, `FieldNode`, and `useField()`.
- Add automatic cancellation of in-flight validation requests using `AbortController`.
- Implement two-tier short-circuiting: skip async validation if sync schema check fails.
- Provide direct field-level `asyncValidators` registration.

Implementation files:

- docs/rfcs/RFC_004_ASYNC_VALIDATION_PIPELINE.md
- packages/core/src/runtime/Runtime.ts
- packages/core/src/field/FieldNode.ts
- packages/core/src/field/FieldState.ts
- packages/core/src/validation/Validation.ts
- packages/core/test/AsyncValidationPipeline.test.ts
- packages/react/src/useField.ts
- packages/react/src/useForm.ts
- packages/react/test/useField.test.tsx

---

### NF-021 Multi-Step and Wizard Form Workflows

- Type: feature / architecture
- Priority: p2
- Area: core-runtime / react
- Milestone: v0.6
- Estimate: 3-5 days
- Dependencies: NF-018, NF-020
- Status: Proposed (see RFC 005)

Scope:

- Design and author RFC 005 for multi-step / wizard form state.
- Support both DOM-preserved (`hidden` fieldsets) and conditionally unmounted step workflows.
- Provide step-scoped validation (`validateFields(names)`).
- Introduce `useWizard` / step management ergonomics in `@native-form/react`.

## Suggested Sprint Order (v0.1)

- Sprint 1: NF-001, NF-003
- Sprint 2: NF-002, NF-004 (part 1)
- Sprint 3: NF-004 (part 2), NF-005
- Sprint 4: NF-006, NF-007, NF-008

## Review Guardrails

Reject PRs that do any of the following without explicit approval:

- Rename broad APIs/methods without user-facing value.
- Split Runtime into many classes/services.
- Add heavy generic factories or DI containers.
- Add EventBus or Service Locator abstractions.

These increase complexity and reduce approachability for little release value.
