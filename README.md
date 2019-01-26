# 🎁 preconstruct

> A smart bundler for libraries

## Why?

Building libraries is difficult enough with creating the right API, writing tests, documentation and everything else that setting up a build system that generates small and performant bundles shouldn't have to be difficult. That's why preconstruct exists. Preconstruct uses [Rollup](https://rollupjs.org) under the hood to generate fast bundles for modern bundlers with ES Module builds, Node.js with CommonJS builds and the browser without a bundler via UMD builds while respecting your [Babel](https://babeljs.io/) config. Preconstruct also strictly enforces the fields in your package.json that configure where Node and bundlers look for your bundles so you don't have to worry about them. Performance and bundle size are common concerns when building libraries so preconstruct generates dev and prod CommonJS bundles so that you can have process.env.NODE_ENV checks to have helpful warnings and errors without slowing down production along with building browser specific bundles when you use `typeof window` so that you can have Node.js specific code which is dead code eliminated from browser bundles.

## Getting Started

```bash
yarn add --dev preconstruct
```

```bash
yarn preconstruct init
```

```bash
yarn preconstruct build
```

## I want feature X!

Balancing between having minimal to no configuration and being able to support everyone's use case is very hard. Preconstruct tries to have good defaults to support lots of common use cases but it won't support everything

- works well with monorepos
- minimal to no config
- opinionated

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
- e.g. if the package has a umd:main field and it's wrong, fix it and ask for a umdName but if it doesn't hava umd:main field, don't do anything

## Ideas

- [ ] good, reliable caching
- [x] use users babel config
- [ ] allow for other entrypoints, automatically generate folders with package.json
- [x] opinionated dist folder structure with verification if it's wrong

# Thanks/Inspiration

- [microbundle](https://github.com/developit/microbundle) was a huge inspiration for this! ❤️
- [rollup](https://rollupjs.org)
- [bolt](https://github.com/boltpkg/bolt) - lots of utils and things in this project were inspired by things in bolt
- all the people who wrote all the dependencies for this project!
