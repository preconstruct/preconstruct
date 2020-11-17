---
"@preconstruct/cli": major
---

Change the way entrypoints are configured. Instead of the entrypoints option referring to the entrypoint directories, they new refer to entrypoint source files. This means that you can

For example, a package that looks like the following in `@preconstruct/cli@1`

`package.json`

```json
{
  "name": "pkg",
  "main": "dist/pkg.cjs.js",
  "preconstruct": {
    "entrypoints": [".", "other"]
  }
}
```

`src/index.js`

```js
export const something = true;
```

`src/other.js`

```js
export const other = true;
```

`other/package.json`

```json
{
  "main": "dist/pkg.cjs.js",
  "preconstruct": {
    "source": "../src/other.js"
  }
}
```

Would need the following changes to work in `@preconstruct/cli@2`

`other/package.json`

```diff
 {
   "name": "pkg",
   "main": "dist/pkg.cjs.js",
   "preconstruct": {
-    "entrypoints": [".", "other"]
+    "entrypoints": ["index.js", "other.js"]
   }
 }
```

`other/package.json`

```diff
 {
   "main": "dist/pkg.cjs.js",
-  "preconstruct": {
-    "source": "../src/other.js"
-  }
 }
```
