---
"@preconstruct/cli": patch
---

Stop memoizing creation of TS programs for declaration generation when the tsconfig is in the package directory to allow garbage collection and prevent out of memory errors (Note that having a tsconfig per package will still be slower than having one at the root of the project since TS will be doing unnecessary repeated work)
