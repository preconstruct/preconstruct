---
"@preconstruct/cli": patch
---

Allow to build UMD files for packages having dependencies with top-level `this` in ESM files. This can often happen if a dependency package is transpiled down to ES5 using TypeScript.
