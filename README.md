# 🎁 preconstruct

> A smart bundler for libraries

> DISCLAIMER:
>
> While preconstruct is pretty stable in terms of bugs and is used in big projects, a lot of things are still in flux and will change so please be aware of that. We're in 0.0.x versions for a reason.

## Why?

Generating small, performant bundles and making consumer bundlers use the right bundles shouldn't have to be difficult.

## Getting Started

```bash
yarn add --dev preconstruct
yarn preconstruct init
yarn preconstruct build
```

## What does preconstruct do?

preconstruct generates bundles for NPM packages with different module formats and enforces that consumer bundlers like webpack and Node can import those packages.

### Performant Bundles

preconstruct generates development and production CommonJS bundles so that you can have `process.env.NODE_ENV` checks to have helpful warnings and errors without slowing down production along with building browser specific bundles when you use `typeof window` so that you can have Node.js specific code which is dead code eliminated from browser bundles.

### package.json Validation & Autofixing

preconstruct strictly enforces that the relevant fields in your package.json which tell Node and bundlers like webpack where to look for your bundles are correct, so you don't have to worry about them, and you'll always be publishing working versions of your packages. preconstruct can also fix most validation problems automatically by running `preconstruct fix`

### Minimal Configuration

Rather than having to configure everything, preconstruct infers how to build your project. For example, if you have a `module` field in your package.json, preconstruct creates an ESM bundle, but if you don't have a `module` field in your package.json, preconstruct won't create an ESM bundle.

### Monorepos

preconstruct is built with monorepo's in mind, rather than having to manage and build packages on an individual level, preconstruct lets you manage and build all of your packages together as a single project.

### Custom Entrypoints

preconstruct lets you create entrypoints beyond the standard entrypoint of `package-name` so a single package can have other entrypoints like `package-name/some-cool-thing` and `my-package/another-cool-thing`. These entrypoints still have bundles in multiple module formats, so Node and consumer bundlers can still get the right module format for them.

### Aliases

preconstruct exports aliases which you can use with tools like Jest and webpack so you can import from entrypoints like consumers do but rather than importing a dist file, you'll be importing the source file.

## Install

```bash
yarn add --dev preconstruct
```

## Usage

### Commands

#### `init`

```bash
preconstruct init
```

`preconstruct init` asks questions about your project and how it should be built.

#### `build`

```bash
preconstruct build
```

`preconstruct build` creates the bundles for your project.

#### `watch`

```bash
preconstruct watch
```

`preconstruct watch` is similar to `preconstruct build` except instead of doing a single build, it starts a watcher and rebuilds the project whenever there are changes.

#### `fix`

```bash
preconstruct fix
```

TODO

#### `validate`

```bash
preconstruct validate
```

TODO

### preconstruct Configuration

preconstruct accepts configuration at three different configuration points; projects, packages and entrypoints. These configuration points can be represented by one package.json or by 20 package.jsons, it depends on the requirements of a specific project. For example, in a single package repo with one entrypoint, it would be represented by a single package.json.

#### Projects

Projects roughly map 1:1 with a version control repository. They specify global configuration that applies to all builds.

##### `packages`

`Array<string>`

`packages` is an array of globs which specify which packages should be built with preconstruct.

###### Default

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "packages": ["."]
  }
}
```

###### Example

```json
{
  "preconstruct": {
    "packages": ["packages/*"]
  }
}
```

##### `globals`

`{ [packageName: string]: (umdName: string) }`

`globals` specifies the UMD names of `peerDependencies` since `peerDependencies` aren't bundled in UMD builds. You **shouldn't** specify this option manually, preconstruct will prompt you for the UMD name of a package when it's necessary.

###### Default

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "globals": {}
  }
}
```

###### Example

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

#### Package

Packages map 1:1 with npm packages. Along with specifying the `entrypoints` option described below, packages are also responsible for specifying dependencies which is necessary for bundling UMD bundles and ensuring that packages will have all of their required dependencies when installed through npm.

##### `entrypoints`

`Array<string>`

`entrypoints` is an array of globs which specify the entrypoints which consumers of your package should be able to import.

###### Default

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "entrypoints": ["."]
  }
}
```

###### Example

```json
{
  "preconstruct": {
    "entrypoints": [".", "other-entrypoint"]
  }
}
```

#### Entrypoint

Entrypoints are the lowest level configuration point and describe a set of bundles for a particular entrypoint.

##### `source`

`string`

`sources` specifies the source file to use for a given entrypoint. It's resolved relative to the package.json where it's specified.

###### Default

> Note: this is the default value, if it's what you want, you don't need to specify it.

```json
{
  "preconstruct": {
    "source": "src/index"
  }
}
```

###### Example

```json
{
  "preconstruct": {
    "source": "modules/index"
  }
}
```

##### Build types

Build types specify what types of bundles preconstruct should build. They are specified via the package.json fields which Node and bundlers like webpack look at to find bundles. It's important to note that **all** of the entrypoints in a package must have the same build types, this is necessary to ensure that common dependencies between entrypoints aren't duplicated.

###### `main`

The `main` field specifies a CommonJS build. It is the only build type which is **required**. This bundle will work in Node and can work in bundlers like webpack but a ES Module build is recommended for bundlers like webpack.

Example:

```jsx
{
  "main": "dist/my-package.cjs.js"
}
```

###### `module`

The `module` field specifies an ES Module build. This bundle is what bundlers like webpack will use.

Example:

```jsx
{
  "module": "dist/my-package.esm.js"
}
```

###### `umd:main`

The `umd:main` field specifies a UMD build. This bundle can be used directly in a browser with a `<script>` tag.

Example:

```jsx
{
  "umd:main": "dist/my-package.umd.min.js"
}
```

<!-- TODO: maybe talk about browser builds, not 100% sure though. -->

<!-- i'm explicitly not mentioning the react-native thing because i doubt it will stay in preconstruct  -->

## I want feature X!

Balancing between having minimal to no configuration and being able to support everyone's use case is a really hard problem. preconstruct tries to have good defaults to support lots of common use cases but it won't support everything. We want to make preconstruct work really well for most use cases rather than being okay for all use cases.

# Thanks/Inspiration

- [microbundle](https://github.com/developit/microbundle) was a huge inspiration for this! ❤️
- [rollup](https://rollupjs.org) - rollup has done the really hard stuff that makes preconstruct possible!
- [bolt](https://github.com/boltpkg/bolt) - lots of utils and things in this project were inspired by things in bolt
- all the people who wrote all the dependencies for this project!
