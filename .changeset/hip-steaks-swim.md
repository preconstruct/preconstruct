---
"@preconstruct/cli": patch
---

Add `keepDynamicImportAsDynamicImportInCommonJS` experimental flag to allow importing Node ESM-only packages in Preconstruct packages. This can be used to ship a package that can be both imported and required and has a dependency that doesn't have a CommonJS distribution.

Note that `import()` is asynchronous so it won't be possible to get access to such ESM-only dependency synchronously.
