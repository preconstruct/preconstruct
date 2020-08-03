---
"@preconstruct/cli": patch
---

Skip parsing modules with Babel to determine if they have default exports or not if we're sure they don't based on a regex when running `preconstruct dev`
