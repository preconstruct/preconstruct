---
"@preconstruct/cli": patch
---

Cache Acorn parse step so that modules are only parsed a single time with Acorn rather than a number of times equal to the number of build types for a given package
