---
"@preconstruct/cli": patch
---

Load Babel lazily in the meain thread to speed up init time as it isn't needed for all code paths.
