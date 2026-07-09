# Changelog

All notable changes to this project are documented in this file.

## 0.1.0-rc.1 - 2026-07-09

### Added

- Browser edge-case runtime coverage for native controls and lifecycle behavior, including:
  - checkbox, radio, select multiple, disabled field serialization semantics
  - dynamic field mount and unmount handling
  - dotted field name and nested value submit scenarios
  - rapid input value stability and submit-during-validation behavior

### Changed

- Runtime async cancellation semantics now enforce latest-wins behavior for overlapping validations.
- Stale or aborted validation completions no longer trigger submit or invalid callback side effects.

### Verification

- `pnpm verify` passes from repository root.
- `@native-form/core` contract and public surface tests pass.
- Workspace build passes for all packages and example app.
