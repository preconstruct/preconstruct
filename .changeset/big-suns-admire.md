---
"@preconstruct/cli": patch
---

Deduplicate Babel helpers when not using @babel/plugin-transform-runtime(note that we still recommend using @babel/plugin-transform-runtime, this is just stopping the duplication if you choose not to use it)
