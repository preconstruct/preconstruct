---
"@preconstruct/cli": patch
---

Fix babel helpers being duplicated when not using @babel/plugin-transform-runtime(note that we still recommend using @babel/plugin-transform-runtime, this is just stopping the duplication if you choose not to use it)
