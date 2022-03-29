---
"@preconstruct/next": major
---

`@preconstruct/next` now makes Next.js prefer the `module` field over the `main` for server-side bundles. This is different to the behaviour that Next.js provides by default, for that reason, this change is happening in a major release of `@preconstruct/next`. The `module` field is generally regarded by most package authors and tools like Preconstruct to only indicate module format and not Node vs browser. This resolves issues with using `preconstruct dev` with packages that have dependencies that ship Node ESM(in addition to CommonJS).
