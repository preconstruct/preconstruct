---
"@preconstruct/cli": patch
---

The `outDir` and `declarationDir` tsconfig options are now ignored. These options are unnecessary for Preconstruct since it controls where the `.d.ts` files are emitted to. This fixes confusing errors if you had these options set.
