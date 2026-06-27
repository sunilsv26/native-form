# Contributing

This document captures contributor expectations for changes in core architecture.

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
- Runtime event order is deterministic and documented in `docs/ARCHITECTURE.md`.
- Runtime chooses `validateField` vs `validate` based on pipeline capabilities.

## Before Opening a PR

Run:

```bash
pnpm --filter @native-form/core test
pnpm build
```

If behavior changes, update `docs/ARCHITECTURE.md` alongside code and tests.
