---
"@preconstruct/next": patch
---

Fixed support for Next.js 12. Note that in Next.js 11 and 12, Next will not read a Babel config from outside of the directory that the Next.js site is in. If you need it to to read your babel config, you will need to do something like this:

```js
// site/babel.config.js
module.exports = require("../babel.config");
```
