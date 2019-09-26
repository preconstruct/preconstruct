# @preconstruct/craco

A [craco](https://github.com/sharegate/craco) plugin for [Preconstruct](https://preconstruct.tools)

## Install

```bash
yarn add @preconstruct/craco
```

## Usage

> Note: this assumes craco is already setup, if you haven't done that already, please do that

Add the plugin to your `craco.config.js` file.

```js
const preconstructPlugin = require("@preconstruct/craco");

module.exports = {
  plugins: {
    plugin: preconstructPlugin
  }
};
```

See an example of this in use at https://github.com/preconstruct/create-react-app-multi-package-repo.

## Thanks

- This module is largely based off https://github.com/jackwilsdon/craco-use-babelrc
