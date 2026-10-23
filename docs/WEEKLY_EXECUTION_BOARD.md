# Weekly Execution Board

This board converts backlog items into a practical week-by-week plan.

## Week 1 (Completed)

Focus: NF-013 React adapter integration test foundation

PR slices:

1. Add React package test setup and smoke tests.
2. Add Form submit success and invalid integration tests.
3. Add useForm lifecycle and useField synchronization tests.

Files:

- packages/react/src/Form.tsx
- packages/react/src/useForm.ts
- packages/react/src/useField.ts
- packages/react/test/Form.test.tsx
- packages/react/test/useForm.test.tsx
- packages/react/test/useField.test.tsx

Exit criteria:

- [x] React tests run through workspace test command.
- [x] Tests are deterministic and green.

## Week 2 (Completed)

Focus: NF-014 Yup adapter MVP

PR slices:

1. Scaffold packages/yup package.
2. Implement yup resolver with dotted path and array index mapping.
3. Add resolver tests and workspace integration.

Files:

- packages/yup/package.json
- packages/yup/tsconfig.json
- packages/yup/src/index.ts
- packages/yup/test/yupResolver.test.ts
- pnpm-workspace.yaml

Exit criteria:

- [x] Yup resolver is contract-compatible with core Validator behavior.
- [x] Test coverage includes nested and array paths.

## Week 3 (Completed)

Focus: NF-015 Adapter contract matrix

PR slices:

1. Introduce reusable adapter contract test utilities.
2. Apply same contract suite to zod and yup adapters.

Files:

- packages/zod/test/contracts/adapterContract.test.ts
- packages/yup/test/contracts/adapterContract.test.ts
- packages/core/src/validation/Validation.ts

Exit criteria:

- [x] Contract suite passes for all supported adapters.

## Week 4 (Completed)

Focus: NF-016 Migration and positioning docs

PR slices:

1. Add RHF/Formik migration guide.
2. Update README and roadmap references.

Files:

- README.md
- docs/MIGRATION_RHF.md
- docs/ROADMAP.md

Exit criteria:

- [x] Migration guide is complete and linked from README.

## Week 5 (Completed)

Focus: NF-017 Field array ergonomics layer

PR slices:

1. Implement ergonomic array path helpers and runtime support.
2. Expand array path and lifecycle coverage tests.

Files:

- packages/core/src/Path.ts
- packages/core/src/runtime/Runtime.ts
- packages/core/test/Path.test.ts
- packages/core/test/Runtime.test.ts

Exit criteria:

- [x] Add/remove/reorder indexed fields remain stable for values and errors.
- [x] Discovery correctly cleans up renamed/re-indexed registry keys.

## Week 6 (Completed)

Focus: NF-018 Watch and selector ergonomics

PR slices:

1. Add selective subscription ergonomics in React hooks (`useWatch`, `useField` selector, `useForm` selector).
2. Add tests for targeted state updates.

Files:

- packages/react/src/useForm.ts
- packages/react/src/useField.ts
- packages/react/src/useWatch.ts
- packages/react/src/shallowEqual.ts
- packages/react/src/index.ts
- packages/react/test/watchSelectors.test.tsx

Exit criteria:

- [x] Targeted subscriptions work without introducing registration APIs.
- [x] Isolated re-renders verified under unit & integration test suite.

## Execution Rules

- One issue per branch.
- One acceptance scope per PR.
- Run pnpm verify before merge.
- Do not start next week focus until current week exit criteria are green.
