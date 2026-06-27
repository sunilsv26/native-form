## Summary

Describe what changed and why.

## Validation

- [ ] pnpm --filter @native-form/core test
- [ ] pnpm verify

## Architecture Checklist (Core Changes)

- [ ] Responsibility boundaries remain aligned with docs/DESIGN.md.
- [ ] Lifecycle semantics remain aligned with docs/LIFECYCLE.md.
- [ ] Runtime API surface changes are explicitly called out as breaking (if any).
- [ ] Contract tests are added or updated.
- [ ] Docs are updated with behavior or contract changes.

## API Surface Checks (If Touched)

- [ ] Runtime API checks updated in packages/core/test/RuntimeApiContract.test.ts.
- [ ] Runtime public key checks updated in packages/core/test/RuntimePublicSurface.test.ts.
- [ ] Core public barrel checks updated in packages/core/test/PublicExportsContract.test.ts.
