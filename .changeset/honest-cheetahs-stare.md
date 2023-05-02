---
"@preconstruct/cli": patch
---

Disable specifying `importConditionDefaultExport` because it doesn't work correctly in `"moduleResoltion": "bundler"`, `@preconstruct/cli@2.6.0` is npm deprecated, `importConditionDefaultExport` will come back in the future.
