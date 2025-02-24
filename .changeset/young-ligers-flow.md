---
"@preconstruct/cli": patch
---

`preconstruct fix`/`preconstruct validate` will now enforce that the `main`/`module`/`browser`/`umd:main` fields are not present when using the experimental `typeModule` flag and the package has `"type": "module"`.
