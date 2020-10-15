---
"@preconstruct/hook": minor
"@preconstruct/cli": patch
---

Add no-op file to `@preconstruct/hook` that will be imported by bundlers instead of the real require hook so that the `preconstruct dev` output will work in bundlers without a module build or bundler config changes(including for React Native's bundler, Metro)
