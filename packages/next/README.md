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
