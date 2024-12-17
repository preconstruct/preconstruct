---
"@preconstruct/cli": minor
---

`package.json#types`/`package.json#typings` fields will now be validated and fixed. They are not needed at all for TypeScript to consume packages built using Preconstruct but when they are present it's best to fix them to avoid confusion.
