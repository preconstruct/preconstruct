# 🎁 preconstruct

> A smart bundler for libraries

> DISCLAIMER:
>
> While preconstruct is pretty stable in terms of bugs and is used in big projects, a lot of things are still in flux and will change so please be aware of that. We're in 0.0.x versions for a reason.

## Why?

Generating small, performant bundles and figuring out how to make bundlers use the right bundles shouldn't have to be difficult.

## Getting Started

```bash
yarn add --dev preconstruct
yarn preconstruct init
yarn preconstruct build
```

## What does preconstruct do?

preconstruct generates small bundles

## Features

### Performant Bundles

Performance and bundle size are common concerns when building libraries so preconstruct generates dev and prod CommonJS bundles so that you can have process.env.NODE_ENV checks to have helpful warnings and errors without slowing down production along with building browser specific bundles when you use `typeof window` so that you can have Node.js specific code which is dead code eliminated from browser bundles.

###

### Strictly Enforcing Configuration

preconstruct strictly enforces the relevant fields in your package.json that tell where Node and bundlers where to look for your bundles so you don't have to worry about them.

### Minimal Configuration

Rather than having to config

### Monorepos

preconstruct is built with monorepo's in mind, rather than having to manage and build packages on an individual level, preconstruct lets you manage and build all of your packages together.

### Custom Entrypoints

Have you ever wanted to add another entrypoint to your package but had trouble making

### Lack of features

Preconstruct uses [Rollup](https://rollupjs.org) under the hood to generate fast bundles for modern bundlers with ES Module builds, Node.js with CommonJS builds and the browser without a bundler via UMD builds while respecting your [Babel](https://babeljs.io/) config.

Preconstruct has a minimal api that doesn't get in the way

That's why preconstruct exists.

## Install

```bash
yarn add --dev preconstruct
```

## Usage

### Commands

#### init

```bash
preconstruct init
```

- Setup package.json with `"main"` and `"module"`
- Setup packages if in monorepo
- probably ask other things

#### build

```bash
preconstruct build
```

- verifies things
  - if `typeof document` or `typeof window` is used, prompt to add browser field
- does the build

#### watch

```bash
preconstruct watch
```

- same as build but watches

#### fix

```bash
preconstruct fix
```

- like init but infers as much as possible
- made for places that already have build setups
- e.g. if the package has a umd:main field and it's wrong, fix it and ask for a umdName but if it doesn't have a umd:main field, don't do anything

### Configuration

Preconstruct accepts

####

## I want feature X!

Balancing between having minimal to no configuration and being able to support everyone's use case is a really hard problem. preconstruct tries to have good defaults to support lots of common use cases but it won't support everything. We want to make preconstruct work really well for most use cases rather than being okay for all use cases.

# Thanks/Inspiration

- [microbundle](https://github.com/developit/microbundle) was a huge inspiration for this! ❤️
- [rollup](https://rollupjs.org) - rollup has done the really hard stuff that makes preconstruct possible!
- [bolt](https://github.com/boltpkg/bolt) - lots of utils and things in this project were inspired by things in bolt
- all the people who wrote all the dependencies for this project!
