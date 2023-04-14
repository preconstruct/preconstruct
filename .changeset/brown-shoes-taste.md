---
"@preconstruct/cli": minor
---

Added a new `exports.unwrappedDefaultExportForImportCondition` config option. It allows you to generate `import` exports condition (and corresponding files) to fix the export shape incompatibility between node and bundlers.

With this option this will always resolve to what has been written as a default export:

```ts
// lib/src/index.js
export default 42;
export const named = "awesome";

// app/consume.mjs
import smth from "lib";
smth; // 42, and not `{ default: 42, named: 'awesome' }`
```
