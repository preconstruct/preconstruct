---
"@preconstruct/cli": major
---

Change default dist filename strategy to include the scope and entrypoint path. For example, with an entrypoint accessible at `@scope/pkg/entrypoint`, the CJS dist filename would be `scope-pkg-entrypoint.cjs.js`. If you'd like to use the old dist filenames, you can set `"distFilenameStrategy": "unscoped-package-name"` in your root Preconstruct config.
