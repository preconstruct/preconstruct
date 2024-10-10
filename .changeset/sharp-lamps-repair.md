---
"@preconstruct/cli": patch
---

Fix `preconstruct dev` with the `typeModule` experimental flag outputting `.d.ts` files with extensionless imports that are invalid with `moduleResolution: "nodenext"` and `type: "module"`
