# Configuration

Preconstruct accepts configuration at three different configuration points; projects, packages and entrypoints. These configuration points can be represented by one package.json or by 20 package.jsons, it depends on the requirements of a specific project. For example, in a single package repo with one entrypoint, it would be represented by a single package.json.

Projects map 1:1 with a version control repository. They specify global configuration that applies to all builds.

## Projects {#projects}

### `packages` {#project-packages}

`Array<string>`

`packages` is an array of globs which specify which packages should be built with preconstruct.

#### Default {#packages-default}

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "packages": ["."]
  }
}
```

#### Example {#packages-example}

```json
{
  "preconstruct": {
    "packages": ["packages/*"]
  }
}
```

### `globals` {#globals}

`{ [packageName: string]: (umdName: string) }`

`globals` specifies the UMD names of `peerDependencies` since `peerDependencies` aren't bundled in UMD builds. You **shouldn't** specify this option manually, preconstruct will prompt you for the UMD name of a package when it's necessary.

#### Default {#globals-default}

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "globals": {}
  }
}
```

#### Example {#globals-example}

```json
{
  "preconstruct": {
    "globals": {
      "react": "React",
      "react-dom": "ReactDOM"
    }
  }
}
```

### `distFilenameStrategy` {#distfilenamestrategy}

`"full" | "unscoped-package-name"`

`distFilenameStrategy` specifies, you should probably use `full`(which is the default) unless you need to have filenames (likely if you have UMD builds whose filename you don't want to change) in which case, you should use `unscoped-package-name`

| Entrypoint | `full` | `unscoped-package-name` |
| --- | --- | --- |
| `pkg` | `dist/pkg.cjs.js` | `dist/pkg.cjs.js` |
| `pkg/entrypoint` | `dist/pkg-entrypoint.cjs.js` | `dist/pkg.cjs.js` |
| `@scope/pkg` | `dist/scope-pkg.cjs.js` | `dist/pkg.cjs.js` |
| `@scope/pkg/entrypoint` | `dist/scope-pkg-entrypoint.cjs.js` | `dist/pkg.cjs.js` |

#### Default {#distfilenamestrategy-default}

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "distFilenameStrategy": "full"
  }
}
```

#### Example {#distfilenamestrategy-example}

```json
{
  "preconstruct": {
    "distFilenameStrategy": "unscoped-package-name"
  }
}
```

## Packages {#packages}

Packages map 1:1 with npm packages. Along with specifying the `entrypoints` option described below, packages are also responsible for specifying dependencies which is necessary for bundling UMD bundles and ensuring that packages will have all of their required dependencies when installed through npm.

### `entrypoints` {#entrypoints-config}

`Array<string>`

`entrypoints` is an array of globs which specify the entrypoints which consumers of your package should be able to import. They are resolved relative to the `src` directory of the package. To get the entrypoint directory from a source file, the extension is removed from the path relative to the `src` directory and if the last part is `index`, the `index` part is removed. For example, an entrypoint of `something.js` would create an entrypoint at `pkg-name/something` and `another/index.js` would create an entrypoint at `pkg-name/another`.

#### Default {#entrypoints-default}

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "entrypoints": ["index.{js,jsx,ts,tsx}"]
  }
}
```

#### Example {#entrypoints-example}

```json
{
  "preconstruct": {
    "entrypoints": ["index.js", "other.js"]
  }
}
```

### `exports` (experimental) {#exports}

```ts
| boolean
| {
    envConditions?: ("browser" | "worker")[];
    extra?: Record<string, JSONValue>;
  };
```

The `exports` config allows you to opt-in to generating an `exports` field.

Using the `exports` field enables a couple of things:

- Importing non-root entrypoints in Node.js ESM
- Disallowing importing modules that aren't specified in the `exports` field
- More specific builds for certain environments

> Note that Preconstruct's support for the `exports` field does not currently include generating ESM compatible with Node.js. While ESM builds are generated, they are targeting bundlers, not Node.js or browsers directly so they use the `module` condition, not the `import` condition.

Note that adding an `exports` field can arguably be a breaking change, you may want to use the `extra` option to add more exports so that imports that worked previously still work or only add the `exports` field in a major version.

To opt into this experimental feature, you must enable it in the root of your project by setting the `exports` experimental flag in your preconstruct config section of your `package.json` file to `true`.

```diff
{
  "name": "@sample/repo",
  "version": "0.0.0",
  "preconstruct": {
+    "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
+      "exports": true
+    },
  }
}
```

The `exports` field feature then needs to be enabled, you can do this at the project or package level like this. The `envConditions` and `extra` options can only be configured at a package level.

```diff
{
  "name": "@sample/package",
  "version": "1.0.0",
  "preconstruct": {
+   "exports": true
  }
}
```

#### `envConditions` {#envconditions}

`Array<"browser" | "worker">`

Specifying the `envConditions` option adds additional environments that Preconstruct will generate bundles for. This option is currently aimed at generating bundles with `typeof SOME_ENV_SPECIFIC_GLOBAL` replaced with what it would be in that environment. It may be expanded to provide the ability to have Preconstruct resolve a different file or etc. depending on the environment in the future.

Builds

- `browser`: Generates a bundle targeting browsers. When this condition is used, the top-level `browser` field will also be set so that older bundlers that do not understand the `exports` field will be able to use the browser build (though when using the exports field, browser CommonJS builds will not be built). When building with this condition, `typeof document` and `typeof window` will be replaced with `"object"` and dead-code elimination will occur based on that.
- `worker`: Generates a bundle targeting web workers/server-side JS runtimes that use web APIs. When building with this condition, `typeof document` and `typeof window` will be replaced with `"undefined"` and dead-code elimination will occur based on that.

```json
{
  "name": "@sample/package",
  "version": "1.0.0",
  "preconstruct": {
    "exports": {
      "envConditions": ["browser", "worker"]
    }
  }
}
```

#### `extra` {#extra}

`Record<string, JSONValue>`

Preconstruct will enforce that the `exports` field that is written can is directly a function of your config, this means that extra properties are not allowed to be written directly in the `exports` field. If you want to add extra entries to the `exports` field, you can use the `extra` option in `preconstruct.exports` and then `preconstruct fix` will add add them to the actual `exports` field.

```json
{
  "name": "@sample/package",
  "version": "1.0.0",
  "preconstruct": {
    "exports": {
      "extra": {
        "./something": "./something.js"
      }
    }
  }
}
```

### `type` (experimental) {#type}

```ts
"module" | "commonjs";
```

> If you're just thinking "I want to write code with the native ECMAScript import and export syntax and have my code work for most people", you likely should not use this feature. This feature allows you to build packages that import Node.js ESM only dependencies and therefore only support being imported from ESM in newer versions of Node.js and some bundlers.

The `type` config being set to `"module"` allows you to generate ECMAScript modules(ESM) compatible with Node.js' implementation of ESM (Node.js ESM), most modern bundlers, etc.

You should likely only use this feature if you fit into one these categories:

- You're interested in the state of modules in the JS ecosystem
- You want to publish a package that statically imports a Node.js ESM only dependency

Node.js' implementation of ESM does not allow importing an ESM module from a CommonJS module synchronously. This means a given package only shipping Node.js ESM means that all of the packages that depend on it either need to use a dynamic `import()` call (which is asynchronous) to import it or only provide Node.js ESM and therefore enforce the same constraints on consumers.

Preconstruct's support for Node.js ESM is currently an experiment to see how Preconstruct would work if it followed Node.js' behaviour for ESM. Note this behaviour means the resulting package will not support tools that do not support newer features like the `exports` field.

- The [`exports` field feature](#exports) must also be enabled.
- There are no entrypoint `package.json`s, the entrypoints are only specified in the `exports` field
- The dist files for all entrypoints are in the `dist` directory in the root of the package
- No `main`, `module`, `browser` or `umd:main` fields are used
- Module resolution internally follows [Node.js ESM module resolution](https://nodejs.org/api/esm.html#import-specifiers) which requires explicitly writing extensions in imports. This includes following `"moduleResolution": "nodenext"` in TypeScript which means writing `.js` to import a TypeScript file.
- The default export of a CommonJS dependency(even if it provides ESM intended for bundlers) will be the whole exports object, not `exports.default` if `exports.__esModule` is set and otherwise the whole exports object which is the default behaviour in Preconstruct.

To use `"type": "module"`, you need to enable the experimental flags and the exports field feature.

```json
"type": "module",
"preconstruct": {
  "exports": true,
  "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
    "exports": true,
    "nodeESM": true
  },
}
```

## Entrypoints {#entrypoints}

Entrypoints are the lowest level configuration point and describe a set of bundles for a particular entrypoint. They are configured by the `package.json` in the folder of the entrypoint. We also have a guide on [adding a second entrypoint](/guides/adding-a-second-entrypoint)

### Build types {#build-types}

Build types specify what types of bundles Preconstruct should build. They are specified via the package.json fields which Node and bundlers like webpack look at to find bundles. It's important to note that **all** of the entrypoints in a package must have the same build types, this is necessary to ensure that common dependencies between entrypoints aren't duplicated.

#### `main` {#main}

The `main` field specifies a CommonJS build. It is the only build type which is **required**. This bundle will work in Node and can work in bundlers like webpack but a ES Module build is recommended for bundlers like webpack.

Example:

```jsx
{
  "main": "dist/my-package.cjs.js"
}
```

**Note:** This file actually just reexports either a production or a development bundle (respectively `dist/my-package.cjs.prod.js` or `dist/my-package.cjs.dev.js` in this example) based on the `process.env.NODE_ENV` value. This allows you to use `process.env.NODE_ENV` checks in your code so 2 distinct bundles are created but at runtime only one of them gets loaded.

#### `module` {#module}

The `module` field specifies an ES Module build. This bundle is what bundlers like webpack will use.

Example:

```jsx
{
  "module": "dist/my-package.esm.js"
}
```

#### `umd:main` {#umdmain}

The `umd:main` field specifies a UMD build. This bundle can be used directly in a browser with a `<script>` tag.

Example:

```jsx
{
  "umd:main": "dist/my-package.umd.min.js"
}
```

### `type` {#type}

The `type` package.json field allows you to opt-in to ES Module-only builds by setting it to `"module"`.

Example:

```jsx
{
  "name": "@sample/package",
  "version": "1.0.0",
  "type": "module"
}
```

### `browser` {#browser}

The `browser` field specifies alias files exclusive to browsers. This allows you to create different bundles from your source code based on `typeof window` and `typeof document` checks - thanks to that you can, for example, remove server-only code (just for those bundles).

**Note:** Those files are not meant to be consumed by browsers "as is". They just assume browser-like environment, but they still can contain for example references to `process.env.NODE_ENV` as that is meant to be replaced by a consuming bundler.
