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

### `imports` {#project-imports}

`boolean`

When enabled, Preconstruct uses each package's [`imports`](https://nodejs.org/api/packages.html#imports) field to determine the conditions it should build and include in the generated `exports` field. This allows a package to use private `#` imports internally and publish builds in which those imports resolve differently for conditions such as `browser`, `worker`, or `development`.

This is a project-level option: configure it in the root `package.json`, not in the `preconstruct` config of an individual workspace package. Each workspace package still defines its own top-level `imports` field though.

The `exports` feature must be enabled for packages using this option.

Preconstruct supports `imports` entries with:

- keys beginning with `#`;
- string targets; and
- nested condition objects.

Every entry should provide a `default` target so that every generated condition set resolves. Array and `null` targets are not supported. The `import`, `require`, `module`, `types`, and versioned `types@` conditions are reserved for Preconstruct's generated output and cannot be used as source conditions.

#### Default {#project-imports-default}

`true`. It is always enabled for a package with `"type": "module"`, even when the project sets it to `false`.

#### Example {#project-imports-example}

```json
{
  "name": "my-package",
  "imports": {
    "#runtime": {
      "browser": "./src/runtime.browser.js",
      "default": "./src/runtime.node.js"
    }
  }
}
```

Code inside the package can then import `#runtime`. Preconstruct generates a browser build using `runtime.browser.js` and a default build using `runtime.node.js`, and writes the corresponding conditions to the generated `exports` field.

### `dynamicImportInCjs` {#dynamic-import-in-cjs}

`boolean`

When enabled, dynamic `import()` expressions are preserved in CommonJS output instead of being converted as part of the CommonJS build. This allows a CommonJS bundle to load an ESM-only dependency asynchronously:

```js
export async function loadDependency() {
  return import("an-esm-only-dependency");
}
```

This option only affects CommonJS output. Static imports and ESM builds are unchanged.

#### Default {#dynamic-import-in-cjs-default}

`true`.

#### Opting out {#dynamic-import-in-cjs-example}

```json
{
  "preconstruct": {
    "dynamicImportInCjs": false
  }
}
```

### Migrating experimental flags {#migrating-experimental-flags}

These entries in `___experimentalFlags_WILL_CHANGE_IN_PATCH` are no longer needed because their behavior is now the default:

| Experimental flag | Migration |
| --- | --- |
| `exports` | Remove it |
| `importsConditions` | Remove it |
| `distInRoot` | Remove it; root-level dist output is only used by `"type": "module"` packages |
| `keepDynamicImportAsDynamicImportInCommonJS` | Remove it |
| `typeModule` | Remove it; `"type": "module"` is recognized automatically |

Run `preconstruct fix` to remove the old flags. It removes the experimental object when it becomes empty and does not add redundant stable options. The stable `exports`, `imports`, and `dynamicImportInCjs` defaults can be disabled with explicit project-level `false` values.

The `logCompiledFiles` and `checkTypeDependencies` flags remain experimental and are not removed.

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

### `exports` {#exports}

```ts
| boolean
| {
    extra?: Record<string, JSONValue>;
    importConditionDefaultExport?: "namespace" | "default";
  };
```

The `exports` config controls whether Preconstruct generates an `exports` field. Generation is enabled by default; set `preconstruct.exports` to `false` to opt out.

Using the `exports` field enables a couple of things:

- Importing non-root entrypoints in Node.js ESM
- Disallowing importing modules that aren't specified in the `exports` field
- More specific builds for certain environments

> For packages that are not marked with `"type": "module"`, Preconstruct's ESM builds target bundlers and use the `module` condition. Packages marked with `"type": "module"` instead produce Node.js-compatible ESM output.

Note that adding an `exports` field can arguably be a breaking change, you may want to use the `extra` option to add more exports so that imports that worked previously still work or only add the `exports` field in a major version.

The `exports` field feature can be configured at the project or package level. The `extra` option can only be configured at the package level. The `importConditionDefaultExport` option can be configured at the project or package level.

#### Default {#exports-default}

`true`.

#### Opting out {#exports-opt-out}

```json
{
  "name": "@sample/package",
  "version": "1.0.0",
  "preconstruct": {
    "exports": false
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

#### `importConditionDefaultExport`

`"namespace" | "default"`

Preconstruct doesn't generate bundles targeting Node ESM to avoid the [dual package hazard](https://nodejs.org/api/packages.html#dual-commonjses-module-packages). Instead of generating a bundle for Node ESM, the CommonJS bundle is used in Node ESM and because of Node's usage of [cjs-module-lexer](https://github.com/nodejs/cjs-module-lexer), importing named exports from CommonJS packages works correctly. Default exports are more complicated though. The way that Preconstruct and many other tools generate CommonJS bundles is like this.

```js
export default "a";
```

↓

```js
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

var main = "a";

exports.default = main;
```

And for compiling importing a default export from a CommonJS module like this,

```js
import a from "a";

console.log(a);
```

↓

```js
"use strict";

var x = require("b");

function _interopDefault(e) {
  return e && e.__esModule ? e : { default: e };
}

var x__default = /*#__PURE__*/ _interopDefault(x);

console.log(x__default.default);
```

however, Node doesn't look at the `__esModule` convention to get the default export of a CommonJS module when importing in ESM. Instead, it uses the whole `module.exports` object as the default export.

This means running `b.mjs` here would log `{ default: "a", __esModule: true }` instead of `"a"`.

```js
// a.cjs
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

var main = "a";

exports.default = main;

// b.mjs
import a from "./a.cjs";

console.log(a);
```

To get around this, you can set `preconstruct.exports.importConditionDefaultExport` to `"default"` which will make Preconstruct generate a ESM module for Node that re-exports the CommonJS bundle with the correct default export.

Currently, this defaults to `"namespace"`, this will change to `"default"` in the next major version.

```json
{
  "name": "@sample/package",
  "version": "1.0.0",
  "preconstruct": {
    "exports": {
      "importConditionDefaultExport": "default"
    }
  }
}
```

### `type` {#type}

```ts
"module" | "commonjs";
```

Setting `type` to `"module"` makes Preconstruct publish Node.js-compatible ECMAScript modules rather than CommonJS output.

Modern Node.js versions can load synchronous ES modules with `require()`. A CommonJS consumer can therefore require a Preconstruct package with `"type": "module"` when the package and its dependency graph do not use top-level `await`. `require()` returns the module namespace object.

If the module graph contains top-level `await`, Node.js throws `ERR_REQUIRE_ASYNC_MODULE`; the consumer must use `import()` instead. Older Node.js versions that do not support `require(esm)` also need `import()`. See Node.js' [`require(esm)` documentation](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require) for its version history and interoperability details.

Packages using this mode still require consumers and tools that understand the `exports` field and Node.js ESM semantics.

- The [`exports` field feature](#exports) must also be enabled.
- There are no entrypoint `package.json`s, the entrypoints are only specified in the `exports` field
- The dist files for all entrypoints are in the `dist` directory in the root of the package
- No `main`, `module`, `browser` or `umd:main` fields are used
- The default export of a CommonJS dependency(even if it provides ESM intended for bundlers) will be the whole exports object, not `exports.default` if `exports.__esModule` is set and otherwise the whole exports object which is the default behaviour in Preconstruct.

Setting `"type": "module"` guarantees imports-based conditions and places the output for every entrypoint in the package's root `dist` directory. `exports` and `imports` already default to `true`, so no additional Preconstruct configuration is normally required.

This inference is package-specific in a monorepo. An explicit project-level `imports: false` does not disable imports-based conditions for a module package. Non-module packages always place each non-root entrypoint's output in that entrypoint's own `dist` directory.

`dynamicImportInCjs` is independent and has no effect on a module package because that package does not produce CommonJS output.

```json
{
  "name": "my-esm-package",
  "type": "module"
}
```

### `tsconfig` {#tsconfig-config}

`String`

`tsconfig` allows you to specify a custom TypeScript configuration filename nor path. Preconstruct will search for this file instead of the default `tsconfig.json`.

This is useful when you need different TypeScript configurations, as for example for development and building.

#### Default {#tsconfig-default}

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "tsconfig": "tsconfig.json"
  }
}
```

#### Example {#tsconfig-example}

```json
{
  "preconstruct": {
    "tsconfig": ["tsconfig.build.json"]
  }
}
```

or

```json
{
  "preconstruct": {
    "tsconfig": ["folder/tsconfig.build.json"]
  }
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

Preconstruct produces a single CommonJS bundle at this path. References to `process.env.NODE_ENV` are preserved so that the consuming runtime or bundler can provide or replace the value.

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

### `browser` {#browser}

The `browser` field specifies alias files exclusive to browsers. Browser builds preserve `typeof window`, `typeof document`, and `process.env.NODE_ENV`; Preconstruct does not replace these expressions or eliminate branches based on them. A consuming bundler may still transform them.
