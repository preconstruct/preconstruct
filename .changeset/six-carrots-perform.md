---
"@preconstruct/cli": patch
---

Fix types like `import('#foo').Foo<import('#bar').Bar>` not replacing the import to `#bar` in generated declarations under the `importsConditions` experimental flag
