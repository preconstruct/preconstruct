# @preconstruct/next

A [Next.js](https://nextjs.org/) plugin to make Next sites work with [`preconstruct dev`](https://preconstruct.tools/guides/using-preconstruct-dev-in-a-monorepo).

## Install

```bash
yarn add @preconstruct/next
```

## Usage

Add the plugin to your `next.config.js` file.

```js
const withPreconstruct = require("@preconstruct/next");

module.exports = withPreconstruct({ ...yourOwnConfig });
```

Note that in Next.js 12, Next will not read a Babel config from outside of the directory that the Next.js site is in. If you need it to to read your babel config, you will need to do something like this:

```js
// site/babel.config.js
module.exports = require("../babel.config");
```
