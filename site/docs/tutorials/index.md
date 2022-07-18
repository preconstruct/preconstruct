---
sidebar_position: 2
---

# Building your first package

> A repository with the end result of this tutorial is available at https://github.com/preconstruct/a-random-number

Before we can use Preconstruct, we need a package to build. We're going to build a package that exports a random number.

The first thing we're going to do is create a directory and run `yarn init` in it which will create a package.json for us.

```bash
$ yarn init
yarn init v1.15.2
question name (a-random-number):
question version (1.0.0):
question description:
question entry point (index.js):
question repository url:
question author:
question license (MIT):
question private:
success Saved package.json
```

Now we're going to create our source file. By default, Preconstruct looks at the src directory to find the source file so we're going to create a file at `src/index.js` that looks like this.

```jsx
export let random = Math.random();
```

Now we can install Preconstruct.

```bash
yarn add --dev @preconstruct/cli
```

We can initialise Preconstruct with `preconstruct init`.

```bash
$ yarn preconstruct init
🎁 ? a-random-number preconstruct is going to change the main field in your package.json, are you okay with that? Yes
🎁 ? a-random-number would you like to generate module builds? this will write to the module field in your package.json Yes
🎁 success initialised project!
```

## What did we just do? {#what-did-we-just-do}

`preconstruct init` added some things to your package.json so it'll probably look something like this.

```json
{
  "name": "a-random-number",
  "version": "1.0.0",
  "main": "dist/a-random-number.cjs.js",
  "module": "dist/a-random-number.esm.js",
  "license": "MIT",
  "devDependencies": {
    "@preconstruct/cli": "^2.1.5"
  }
}
```

<details>

<summary>What does all this mean?</summary>

```json
"main": "dist/a-random-number.cjs.js",
```

The `main` field specifies what file Node and older bundlers should look at when someone uses your package. Preconstruct has automatically set it to `dist/a-random-number.cjs.js` which is based on the package name `a-random-number`.

```json
"module": "dist/a-random-number.esm.js",
```

The `module` field specifies what file newer bundlers like webpack should look at when someone uses your package.

</details>

## We need to compile our code with Babel {#we-need-to-compile-our-code-with-babel}

If we run `yarn preconstruct build` now, we'll get a couple files but let's look at the ESM one.

```jsx
let random = Math.random();

export { random };
```

This looks good but this file is using `let` which means that it'll break if people use the package with some toolchains.

To fix this, we're going to use Babel. Preconstruct uses Babel under the hood so if we add a Babel config, Preconstruct will use it.

We're going to install `@babel/preset-env` and add it to a `.babelrc`.

```bash
yarn add --dev @babel/preset-env
```

```json
{
  "presets": ["@babel/preset-env"]
}
```

If we run `yarn preconstruct build` now, our code will be compiled with `@babel/preset-env` so our ESM file looks like this.

```jsx
var random = Math.random();

export { random };
```

Now it's using `var` and it'll work everywhere 🎉

## Publishing {#publishing}

Now that our package is ready for people to use for all their random number needs we can publish it to npm.

We're going to add some package scripts to make it easier and make sure that we don't publish our package without building it first.

```json
"scripts": {
  "build": "preconstruct build",
  "release": "yarn build && npm publish"
}
```

So now we can run `yarn release` to do a release.

## Going further {#going-further}

Preconstruct can do a lot more than building a simple package like this. You can learn more about what Preconstruct can do by going through Preconstruct's other tutorials:

- [Setting up a package exports multiple entrypoints](/tutorials/multiple-entrypoints)
- [Setting up a monorepo with preconstruct](/tutorials/monorepo)
