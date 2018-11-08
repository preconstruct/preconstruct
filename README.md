# 🎁 preconstruct

> A smart bundler for libraries

- works well with monorepos
- minimal to no config
- lots of build time optimistions
- uses rollup under the hood
- opinionated

> THIS IS NOT READY, THIS IS JUST WHAT IT SHOULD LOOK LIKE IN THE FUTURE

## Install

```bash
yarn add --dev preconstruct
```

## Usage

```bash
preconstruct init
```

- Setup package.json with `"main"` and `"module"`
- Setup packages if in monorepo
- probably ask other things

```bash
preconstruct build
```

- verifies things
  - if `typeof document` or `typeof window` is used, prompt to add browser field
- does the build

```bash
preconstruct watch
```

- same as build but watches

## Ideas

- good, reliable caching
- use users babel config
- allow for other entrypoints, automatically generate folders with package.json
- opinionated dist folder structure with verification if it's wrong

# Thanks/Inspiration

- [microbundle](https://github.com/developit/microbundle) was a huge inspiration for this! ❤️
- [rollup](https://rollupjs.org)
- [bolt](https://github.com/boltpkg/bolt) - lots of utils and things in this project were inspired by things in bolt
- all the people who wrote all the dependencies for this project!
