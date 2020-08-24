---
"@preconstruct/cli": patch
---

Fix bug in reading of TS config resulting in wrong type definitions being generated in some cases. This should remove the need for the experimental `useTSMorphToGenerateTSDeclarations` and `useSourceInsteadOfGeneratingTSDeclarations` flags.
