---
"@preconstruct/cli": patch
---

Skip unnecessary repeated module resolution when doing a build (this won't make a very noticable difference for projects with a small amount of packages and entrypoints but will for projects with a large amount of packages and entrypoint)
