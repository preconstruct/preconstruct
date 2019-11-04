# 🎁 preconstruct

> A smart build tool for libraries

## Why?

Generating small, performant bundles and making consumer bundlers use the right bundles shouldn't have to be difficult.

## Getting Started

```bash
yarn add --dev @preconstruct/cli
yarn preconstruct init
yarn preconstruct build
```

## [Read the docs on preconstruct.tools](https://preconstruct.tools)

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

`preconstruct init` asks questions about your project and how it should be built and creates the appropriate config in your package.json.

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

#### `dev`

`preconstruct dev` creates files and symlinks in the dist folders of entrypoints which map to the appropriate source file so that the package can be imported from Node and in bundlers and the source file will be imported.

##### How should I use it?

> Note: `preconstruct dev` is made for **multi-package repos**, it is NOT intended to be used in single-package repos.

It's best to use the `dev` command in a postinstall hook so that people don't have to worry about running it.

```json
{
  "scripts": {
    "postinstall": "preconstruct dev"
  }
}
```

> Note: `preconstruct dev` also needs to be run whenever the project's packages or entrypoints change.

#### `fix`

```bash
preconstruct fix
```

`preconstruct fix` fixes invalid configuration in a project. It also throws an error when there is an issue which cannot be resolved automatically.

#### `validate`

```bash
preconstruct validate
```

`preconstruct validate` checks that the project, packages and entrypoints are all valid.

> Note: A build can still fail even if validate doesn't fail because there are some checks which can only happen during

<!-- Thing that should be thought about: should validate do a build but not write to disk? -->

## I want feature X!

Balancing between having minimal to no configuration and being able to support everyone's use case is a really hard problem. preconstruct tries to have good defaults to support lots of common use cases but it won't support everything. We want to make preconstruct work really well for most use cases rather than being okay for all use cases.

# Thanks/Inspiration

- [microbundle](https://github.com/developit/microbundle) was a huge inspiration for this! ❤️
- [rollup](https://rollupjs.org) - rollup has done the really hard stuff that makes preconstruct possible!
- [bolt](https://github.com/boltpkg/bolt) - lots of utils and things in this project were inspired by things in bolt
- [Kye Hohenberger](https://github.com/tkh44) for thinking of the name preconstruct
- Too many awesome people to name at [Thinkmill](https://thinkmill.com.au) who have given so much great feedback to make preconstruct better 💝
- all the people who wrote all the dependencies for this project!
