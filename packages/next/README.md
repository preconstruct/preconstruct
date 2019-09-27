# @preconstruct/next

A [Next.js](https://nextjs.org/) plugin for [Preconstruct](https://preconstruct.tools)

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
