---
"@preconstruct/next": patch
---

Importing dependencies in server-side code will no longer bundle @preconstruct/hook(and therefore Babel) when using `preconstruct dev` and this package. Note this is specific to Next and is not generally needed because Next changes webpack's `mainFields` when bundling for Node to prefer the `main` field over webpack's default of prefering the `module` field.
