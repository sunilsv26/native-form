# Release Checklist

Use this checklist before tagging a release.

## Quality Gates

- [x] pnpm verify passes.
- [x] @native-form/core tests pass.
- [x] Workspace build passes.

## Architecture and Contracts

- [x] Runtime API contract tests pass.
- [x] Runtime public surface type contract passes.
- [x] Core public barrel export contract passes.
- [x] Legacy shim runtime symbol contract passes.
- [x] Legacy shim type parity contract passes.
- [x] Core public barrel type export contract passes.
- [x] Design and lifecycle docs remain consistent with implementation.

## Documentation

- [x] README reflects current API and guidance.
- [x] docs/architecture.md and module docs are updated for behavior changes.
- [x] docs/CONTRIBUTING.md reflects current review checklists.

## Versioning and Publishing

- [ ] Package versions are updated as needed.
- [x] Changelog/release notes are prepared.
- [ ] Release tag and publication steps are verified.
