# Alternative entrypoints proposal

> not 100% sure about the name entrypoints but it's the best name i've got so far

## What problem is this proposal addressing?

You have a package and you want people to be able to import from multiple different entry points in the package. e.g. `react-dom` and `react-dom/server`

## Concepts

After this proposal, there will be a new concept in preconstruct, an entrypoint. This proposal also creates a clear distinction between projects and packages which wasn't there previously. Note that all of these concepts are represented by package.jsons, in some projects all three concepts will be in a single package.json, in some projects, they will all be represented by different package.jsons or somewhere in between.

There are some options which will cascade from projects down to packages and from packages to entrypoints. Currently the only option like this is `globals` which is what specifies the global names for peerDependencies which are excluded in UMD builds and thus preconstruct has to know the global names for.

### Projects

Projects are the largest unit in preconstruct. In a monorepo, the options for the project are configured here such as the [packages](#packages). In a single package setup, the project will be equal to the package.

### Packages

Preconstruct packages map 1:1 with npm packages and are composed of a number of entrypoints. The entrypoints are defined with the `entrypoints` option in a package's preconstruct config. The `entrypoints` option can be specified as a glob. Packages are also responsible for specifying dependencies which is important for bundling UMD bundles and ensuring that packages will have all of their required dependencies when installed through npm.

### Entrypoints

Entrypoints are the lowest level concept and represent a set of bundles for a particular entrypoint. Entrypoints will have a new `source` option in their preconstruct config which specifies the source of a particular entrypoint. It will default to `src/index.js`.

## Examples

Note that all of these examples are for single package repos because the examples don't really change with monorepos, the only difference is that the root package.json specifies the preconstruct packages and that already works. This also doesn't show UMD or module builds for the simplicity of these examples but UMD and module builds will also work.

### Single package repo custom source

`package.json`

```json
{
  "name": "my-cool-library",
  "version": "1.0.0",
  "main": "dist/my-cool-library.cjs.js",
  "preconstruct": {
    "source": "modules/index.js"
  }
}
```

`modules/index.js`

```jsx
export let sum = (a, b) => a + b;
```

`dist/my-cool-library.cjs.js`

```jsx
// probably some other rollup stuff

exports.sum = (a, b) => a + b;
```

### Single package repo, multi entrypoint

`package.json`

```json
{
  "name": "my-cool-library",
  "version": "1.0.0",
  "main": "dist/my-cool-library.cjs.js",
  "preconstruct": {
    "source": "modules/index.js",
    "entrypoints": [".", "something"]
  }
}
```

`something/package.json`

```json
{
  "main": "some-dist-folder-not-sure-exactly-where-yet/not-sure-about-the-filename-either.cjs.js",
  "preconstruct": {
    "source": "../modules/something.js"
  }
}
```

`modules/index.js`

```jsx
export let sum = (a, b) => a + b;
```

`modules/something.js`

```jsx
export let multiply = (a, b) => a * b;
```

`dist/my-cool-library.cjs.js`

```jsx
// probably some other rollup stuff

exports.sum = (a, b) => a + b;
```

`some-dist-folder-not-sure-exactly-where-yet/not-sure-about-the-filename-either.cjs.js`

```jsx
// probably some other rollup stuff

exports.multiply = (a, b) => a * b;
```

### Single package repo, multi entrypoint, common dependency

`package.json`

```json
{
  "name": "my-cool-library",
  "version": "1.0.0",
  "main": "dist/my-cool-library.cjs.js",
  "preconstruct": {
    "source": "modules/index.js",
    "entrypoints": [".", "something"]
  }
}
```

`something/package.json`

```json
{
  "main": "some-dist-folder-not-sure-exactly-where-yet/not-sure-about-the-filename-either.cjs.js",
  "preconstruct": {
    "source": "../modules/something.js"
  }
}
```

`modules/common.js`

```jsx
export let identity = x => x;
```

`modules/index.js`

```jsx
import { identity } from "./common";

export let sum = (a, b) => identity(a + b);
```

`modules/something.js`

```jsx
import { identity } from "./common";

export let multiply = (a, b) => identity(a * b);
```

`some-dist-folder-not-sure-exactly-where-yet/as-yet-unnamed-common.js`

```jsx
// probably some other rollup stuff

exports.identity = x => x;
```

`dist/my-cool-library.cjs.js`

```jsx
// probably some other rollup stuff

var common = require("../some-dist-folder-not-sure-exactly-where-yet/as-yet-unnamed-common.js");

exports.sum = (a, b) => (0, common).identity(a + b);
```

`some-dist-folder-not-sure-exactly-where-yet/not-sure-about-the-filename-either.cjs.js`

```jsx
// probably some other rollup stuff

var common = require("./as-yet-unnamed-common.js");

exports.multiply = (a, b) => (0, common).identity(a * b);
```

## FAQ

### Why are entrypoints and packages separate things? Couldn't they be the same thing and people could have more packages when they would have more entrypoints with this proposal?

In two words, common dependencies.

Let's say we have module A, B and C. Module A and B are entrypoints and they both depend on C. You don't want module C to be duplicated in both A and B, module C should be in it's own bundle which should be imported by modules A and B. Because of this, we need both the concepts so that preconstruct can know where package boundaries are and thus where to bundle.

## Open Questions

### Will there be a single dist folder with all the bundles in a single package or a dist folder per entrypoint?

I'm not sure about this and I think it's not worth thinking about until implementing this because this is probably dependant on how rollup works and other things I haven't yet considered and it doesn't really affect consumers.
