---
"@preconstruct/cli": major
---

Stabilise the project-level `imports` and `dynamicImportInCjs` options and default them to `true`. The `exports` option now also defaults to `true`. Packages with `"type": "module"` place all entrypoint output in the package's root `dist` directory, and `preconstruct fix` removes the former experimental flags.
