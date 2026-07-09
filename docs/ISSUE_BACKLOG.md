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

Scope:

- Write RFC for plugin/middleware extension points around Runtime private flow hooks.

Acceptance criteria:

- RFC documents goals, API sketch, lifecycle integration, and migration strategy.
- No implementation required in this issue.

---

### NF-012 Serializer evolution investigation

- Type: feature
- Priority: p2
- Area: core-runtime
- Milestone: v0.3
- Estimate: 2-3 days
- Dependencies: NF-010

Scope:

- Evaluate serializeFields(fields) direction while preserving current serialize(form) API compatibility.

Acceptance criteria:

- Design note with tradeoffs and migration path.
- Decision captured with rationale and impact.

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
