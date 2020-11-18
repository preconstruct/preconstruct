---
"@preconstruct/cli": major
---

Change the way entrypoints are configured. Instead of the entrypoints option referring to the entrypoint directories, they new refer to entrypoint source files. They are resolved relative to the `src` directory of the package. To get the entrypoint directory from a source file, the extension is removed from the path relative to the `src` directory and if the last part is `index`, the `index` part is removed. For example, an entrypoint of `something.js` would create an entrypoint at `pkg-name/something` and `another/index.js` would create an entrypoint at `pkg-name/another`.

`preconstruct fix` will also now automatically create the entrypoint `package.json`s because it already knows where the source file is.

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
