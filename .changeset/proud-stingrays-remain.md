---
"@preconstruct/cli": patch
---

Limit fast-glob version range because of issue
fast-glob versions after 3.2.7 have an issue https://github.com/mrmlnc/fast-glob/issues/351
So it's good to temporary limit the version as workaround, until that issue is fixed.
