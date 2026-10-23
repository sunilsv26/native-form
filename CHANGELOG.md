# Changelog

All notable changes to this project are documented in this file.

## 0.5.0-rc.1 - 2026-10-23

### Added

- Field array path utilities in `@native-form/core`:
  - `splitPath`, `parseArrayItemPath`, `isArrayItemPath`, `matchArrayItemPath`, `shiftArrayItemIndex`, `remapArrayItemIndex`.
- `useWatch` hook in `@native-form/react` supporting single-field, multi-field, and custom selector subscriptions with default values.
- `useField` selector option for fine-grained field slice subscriptions (e.g. error-only).
- `useForm` `selector` and `subscribe: false` options for decoupled form-level rendering.
- Synchronous `form.watch` helper on `UseFormResult`.
- `@native-form/yup` validation adapter (`yupResolver`).
- `@native-form/adapter-contracts` shared adapter test matrix and fixtures.
- `shallowEqual` structural equality utility for objects and arrays.

### Changed

- Stabilized indexed field lifecycle in `Runtime`: existing fields retain `dirty` and `touched` states during dynamic additions, and removed fields have stale error UI and records cleared.
- Fixed control rename and re-index discovery in `Discovery` and `FieldRegistry` to unregister stale registry keys.
- Exported `FieldEvents`, `ValidationEvents`, `FormEvents`, and `NativeFormElement` from `@native-form/core` entry point, resolving all API Extractor warnings.

### Verification

- `pnpm verify` passes (146 tests across core, react, zod, and yup).
- `api:extract` passes cleanly for core, react, zod, and yup with 0 errors and 0 warnings.
- Workspace production build passes across all packages and the Vite example app.

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
