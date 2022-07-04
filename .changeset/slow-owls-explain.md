---
"@preconstruct/cli": patch
---

Imports to `@babel/runtime/helpers/esm/*` will now be rewritten to `@babel/runtime/helpers/*` for CommonJS outputs. This fixes the CommonJS output in case you have `["@babel/plugin-transform-runtime", { "useESModules": true }]`) in your Babel config.
