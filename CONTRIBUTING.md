# Contributing to Native Form

Thank you for your interest in contributing to **Native Form**! We welcome all contributions, including bug reports, documentation improvements, framework adapters, and feature suggestions.

---

## 🚀 Quick Start / Development Setup

Native Form is structured as a pnpm + Turborepo monorepo.

### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 10.0.0 (`npm install -g pnpm`)

### 1. Clone & Install

```bash
git clone https://github.com/sunilsv26/native-form.git
cd native-form
pnpm install
```

### 2. Build the Monorepo

```bash
pnpm build
```

### 3. Run the Test Suites

We maintain strict 100% test passing standards across all workspaces:

```bash
# Run all tests across the monorepo
pnpm test

# Or run tests in watch mode for a specific package
pnpm --filter @native-form/core test
pnpm --filter @native-form/react test
```

### 4. Verify Monorepo Integrity

Before submitting a Pull Request, always run the full verification command:

```bash
pnpm verify
```

This ensures that:
1. All packages build cleanly with TypeScript.
2. All 280+ unit, integration, and failure mode test suites pass.

---

## 📁 Repository Structure

```
native-form/
├── packages/
│   ├── core/              # Headless, zero-dependency browser runtime & serialization engine
│   ├── react/             # React 18 & 19 hooks (useForm, useField, useWizard, useFieldArray)
│   ├── zod/               # Zod validation resolver (< 500 B)
│   ├── valibot/           # Valibot validation resolver (< 500 B)
│   └── yup/               # Yup validation resolver (< 500 B)
├── examples/
│   └── vite/              # Interactive React + Vite showcase playground
```

---

## 💡 Contribution Opportunities (Great First Issues)

We are actively seeking community contributions in the following areas:

1. **Framework Adapters**:
   - `@native-form/vue` (Vue 3 `<script setup>` composition hook)
   - `@native-form/svelte` (Svelte 5 runes wrapper)
   - `@native-form/solid` (SolidJS primitive)
2. **Schema Resolvers**:
   - `@native-form/arktype` (ArkType adapter)
   - `@native-form/superstruct` (Superstruct adapter)
3. **Documentation & Guides**:
   - Integration recipes for Next.js Server Actions, Remix, and Astro.
   - Interactive live playground examples.

---

## 📝 Pull Request Guidelines

1. **Fork & Branch**: Create a feature branch from `main` (e.g. `feat/vue-adapter` or `fix/select-multiple`).
2. **Tests**: Add unit or integration tests covering your changes in the package's `test/` directory.
3. **API Audit**: If modifying public exports or types, run `pnpm run api:extract` to verify public API contracts.
4. **Clean Commits**: Follow Conventional Commits format (`feat: ...`, `fix: ...`, `docs: ...`, `test: ...`).

---

## ⚖️ Code of Conduct

Please be respectful and constructive in all issues, discussions, and code reviews. We strive to maintain an inclusive, welcoming community for developers of all backgrounds and experience levels.
