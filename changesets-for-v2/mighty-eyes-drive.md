---
"@preconstruct/cli": major
---

Change the way that `process.env.NODE_ENV` is replaced in the production CJS bundle to search for `process.env.NODE_ENV` in the AST and replace it rather than using Terser to replace it and also skip running Terser on the production CJS bundle and instead rely on Rollup's dead code elimination to improve build performance. It's extremely unlikely that this will break anything but this is being made in a major release just in case it does.
