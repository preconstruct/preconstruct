---
"@preconstruct/cli": patch
---

Fix outputting `.d.ts` files with extension-less imports that are invalid when using the experimental flag `typeModule` with `moduleResolution: "nodenext"` and `type: "module"` in `dev` and `build`
