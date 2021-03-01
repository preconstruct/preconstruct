---
"@preconstruct/cli": patch
---

Fixed the `watch` command not clearing dev links of additional entrypoints correctly and creating an infinite loop because of this.
