# Contributing

This document captures contributor expectations for changes in core architecture.

## Core Architecture PR Checklist

Use this checklist for any PR that changes behavior in `packages/core`.

- [ ] Responsibility boundaries are preserved per [docs/DESIGN.md](DESIGN.md).
- [ ] Runtime lifecycle semantics remain consistent with [docs/LIFECYCLE.md](LIFECYCLE.md).
- [ ] Runtime public API surface changes are treated as breaking unless explicitly justified and documented.
- [ ] New behavior is covered by contract tests (not only happy-path tests).
- [ ] Related docs are updated in the same PR when behavior or contracts change.

### Responsibility Guardrails

- `Runtime` orchestrates collaborators; it should not absorb collaborator internals.
- `FieldNode` owns one field's state only and must not coordinate cross-field/runtime concerns.
- `ValidationPipeline` owns validation strategy; `Runtime` owns invocation timing and lifecycle.
- `FieldErrorRenderer` owns error projection in the DOM; do not move rendering details back into `Runtime` or `FieldNode`.

## Validation Adapter Checklist

When adding or changing a validation adapter/pipeline, make sure all of the following are true:

- Implement the `ValidationPipeline` contract:
  - `validate(values, context)` for full-form validation.
  - `validateField(field, values, context)` for field-triggered validation.
- Declare `capabilities.supportsFieldScopedValidation` explicitly.
- Respect runtime precedence order:
  1. injected `pipeline`
  2. `schema`
  3. `validator`
  4. native browser validity fallback
- If field-scoped validation is not supported by the adapter, set:
  - `supportsFieldScopedValidation: false`
- Ensure abort signal is forwarded to underlying async validation work.

## Required Tests

Adapter or pipeline changes must include/update tests for:

- native-only path behavior
- schema/validator path behavior
- abort signal forwarding
- precedence behavior (`pipeline` over `schema`/`validator`)
- field-triggered path behavior (`validateField`) with capability-aware branching

## Runtime Contract Notes

- `FieldNode` remains the single source of truth for per-field state.
- Runtime event order is deterministic and documented in [docs/LIFECYCLE.md](LIFECYCLE.md).
- Runtime chooses `validateField` vs `validate` based on pipeline capabilities.
- Runtime API surface and ownership policy are defined in [docs/DESIGN.md](DESIGN.md).

## Lifecycle and Event-Order Coverage

Behavioral PRs touching lifecycle should include or update tests that cover:

- mount and unmount transitions
- input and change validation paths
- blur and touched semantics
- reset semantics for dirty/touched/error state
- invalid submit path (`form:invalid` and no `form:submit`)
- valid submit path (`form:submit`)
- `submitting` boundary (`true` only during `onSubmit`)
- `validating` boundary (`true` only during active validation)

## Field Path Authoring

- Prefer `formPath(...)` and `arrayItemPath(...)` from `@native-form/core` when constructing field names in code.
- Use plain string literals only when the path is static and local (for example a single inline input).
- For indexed arrays, do not hand-concatenate path strings; use `arrayItemPath("users", index, "email")`.
- Keep validation issue names aligned to the same dotted path format used by field names.

## Before Opening a PR

Run:

```bash
pnpm --filter @native-form/core test
pnpm build
```

If behavior changes, update [docs/architecture.md](architecture.md) alongside code and tests.

If design boundaries or lifecycle contracts change, update both:

- [docs/DESIGN.md](DESIGN.md)
- [docs/LIFECYCLE.md](LIFECYCLE.md)
