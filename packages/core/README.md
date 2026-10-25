# @native-form/core

Framework-agnostic, zero-registration native HTML-first form runtime and validation engine.

[![npm version](https://img.shields.io/npm/v/@native-form/core.svg)](https://www.npmjs.com/package/@native-form/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- **Zero Manual Registration**: Discovers form controls directly from the DOM by their `name` attribute.
- **Fast MutationObserver Sync**: Automatically detects dynamic field additions and removals without manual hook bindings.
- **Native & Typed Serialization**: Supports raw string/FormData extraction or automatic coercion into numbers, booleans, and arrays.
- **Nested Path Resolution**: Handles dot notation (`user.email`) and bracket notation (`items[0].name`) automatically.
- **Async Validation Pipeline**: Debounced async validation with automatic `AbortController` cancellation for in-flight requests.
- **Step Memory Hydration**: Optional `preserveUnmountedValues` caches field state when controls unmount (e.g. multi-step wizards).

## Installation

```bash
npm install @native-form/core
# or
pnpm add @native-form/core
# or
yarn add @native-form/core
```

## Quick Start (Vanilla JS)

```html
<form id="myForm">
  <input name="email" type="email" required />
  <input name="age" type="number" min="18" />
  <button type="submit">Submit</button>
</form>
```

```ts
import { Runtime } from "@native-form/core";

const formEl = document.getElementById("myForm") as HTMLFormElement;

const runtime = new Runtime({
  mode: "onBlur",
  serializationMode: "typed",
  onSubmit: (values) => {
    console.log("Submitted typed values:", values);
  },
});

runtime.mount(formEl);
```

## Documentation

For full documentation and advanced guides, see the [Native Form GitHub Repository](https://github.com/sunilsv26/native-form).

## License

MIT © [Sunil](https://github.com/sunilsv26)
