---
"@preconstruct/cli": patch
---

Only generate the Babel helpers that are used and not imported from `@babel/runtime` along with only generating and parsing them once rather than per package (note that unused helpers were already removed from the bundles, this is just a performance improvement when doing a build)
