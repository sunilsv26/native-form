# Release Checklist

Use this checklist before tagging a release.

## Quality Gates

- [ ] pnpm verify passes.
- [ ] @native-form/core tests pass.
- [ ] Workspace build passes.

## Architecture and Contracts

- [ ] Runtime API contract tests pass.
- [ ] Runtime public surface type contract passes.
- [ ] Core public barrel export contract passes.
- [ ] Design and lifecycle docs remain consistent with implementation.

## Documentation

- [ ] README reflects current API and guidance.
- [ ] docs/architecture.md and module docs are updated for behavior changes.
- [ ] docs/CONTRIBUTING.md reflects current review checklists.

## Versioning and Publishing

- [ ] Package versions are updated as needed.
- [ ] Changelog/release notes are prepared.
- [ ] Release tag and publication steps are verified.
