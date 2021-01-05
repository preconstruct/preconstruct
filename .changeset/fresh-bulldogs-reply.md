---
"@preconstruct/cli": patch
---

Improvements to Babel helper generation so that @babel/runtime(and the core-js versions) is automatically used when it is a dependency even without @babel/plugin-transform-runtime including using all of the available helpers in the version of @babel/runtime that is specified as a dependency(without Preconstruct, unless you specify the version of @babel/runtime that you use in @babel/plugin-transform-runtime, Babel helpers that aren't available in the oldest version of @babel/runtime will be inlined rather than imported from @babel/runtime).
