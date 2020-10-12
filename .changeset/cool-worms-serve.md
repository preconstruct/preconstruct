---
"@preconstruct/cli": patch
---

Disable usage of worker processes when running on CI to improve performance(Emotion's preconstruct build on CircleCI went from ~2 minutes to ~10 seconds when disabling the worker)
