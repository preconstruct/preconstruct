---
"@preconstruct/hook": minor
"preconstruct": minor
---

Remove automatic inclusion of `@babel/plugin-transform-runtime`.

Preconstruct no longer automatically includes `@babel/plugin-transform-runtime` to reduce confusion where code works when built with Preconstruct but fails if built using another tool which directly uses a project's Babel config. You should **include `@babel/plugin-transform-runtime`** in your Babel config unless it is already included.

```js
{
  "plugins": ["@babel/plugin-transform-runtime"]
}
```
