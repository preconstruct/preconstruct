# preconstruct

## 1.0.0

### Major Changes

- [`c4886ea`](https://github.com/preconstruct/preconstruct/commit/c4886ea432a839291437c3346ddc6253b462c918) [#218](https://github.com/preconstruct/preconstruct/pull/218) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Rename package to @preconstruct/cli

## 0.3.2

### Patch Changes

- [`21bbc08`](https://github.com/preconstruct/preconstruct/commit/21bbc084418589e931773e529e913df120c2fb16) [#205](https://github.com/preconstruct/preconstruct/pull/205) Thanks [@Vultraz](https://github.com/Vultraz)! - Fixed dist file check failing on Windows due to path separator mismatch

## 0.3.1

### Patch Changes

- [`078886b`](https://github.com/preconstruct/preconstruct/commit/078886b9de4c060a89a100751ef0bf42cbf3e95b) [#171](https://github.com/preconstruct/preconstruct/pull/171) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Prompt for entrypoint source when not the entrypoint is not at the root of the package

## 0.3.0

### Minor Changes

- [`f02cce5`](https://github.com/preconstruct/preconstruct/commit/f02cce5b05650485da522f29dd7758b290505986) [#163](https://github.com/preconstruct/preconstruct/pull/163) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Remove automatic inclusion of `@babel/plugin-transform-runtime`.

  Preconstruct no longer automatically includes `@babel/plugin-transform-runtime` to reduce confusion where code works when built with Preconstruct but fails if built using another tool which directly uses a project's Babel config. You should **include `@babel/plugin-transform-runtime`** in your Babel config unless it is already included.

  ```js
  {
    "plugins": ["@babel/plugin-transform-runtime"]
  }
  ```

### Patch Changes

- [`a24784a`](https://github.com/preconstruct/preconstruct/commit/a24784a302028b95bb5686921cf948cac096d530) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Update dependencies

* [`11e0f62`](https://github.com/preconstruct/preconstruct/commit/11e0f621983da71215953a06f0aa66c482048568) [#170](https://github.com/preconstruct/preconstruct/pull/170) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Use detected indentation when writing package.json files

* Updated dependencies [[`f02cce5`](https://github.com/preconstruct/preconstruct/commit/f02cce5b05650485da522f29dd7758b290505986)]:
  - @preconstruct/hook@0.1.0

## 0.2.0

### Minor Changes

- [72989b6](https://github.com/preconstruct/preconstruct/commit/72989b6693ea245a50c2be92813ad794e0eb5e02) [#106](https://github.com/preconstruct/preconstruct/pull/106) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Prompt to create an entrypoint if a glob is a path and the directory doesn't exist

## 0.1.3

### Patch Changes

- [aefeb4f](https://github.com/preconstruct/preconstruct/commit/aefeb4f55c11a847217a5f868e132bd20a373711) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Use TypeScript internally

- Updated dependencies [aefeb4f]:
  - @preconstruct/hook@undefined

## 0.1.2

### Patch Changes

- [13b79ea](https://github.com/preconstruct/preconstruct/commit/13b79ea642e74441cf4311beb8cec295a26ae1fd) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add v8-compile-cache
- [681537c](https://github.com/preconstruct/preconstruct/commit/681537cbb6cf7dc8e4011b5ee8a3f7f8e31ea831) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Remove unused dependencies
- [6dcfc40](https://github.com/preconstruct/preconstruct/commit/6dcfc40b746004e5e6b28064f9f2939f8399a7ed) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Improve error message for Babel parse errors

## 0.1.1

### Patch Changes

- [f14c39e](https://github.com/preconstruct/preconstruct/commit/f14c39ebb0fb69e0a645dce6f1575b135e6e42e2) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add a comment to the commonjs file for preconstruct dev explaining what it does
- [7c278d2](https://github.com/preconstruct/preconstruct/commit/7c278d2f7815d99b1e89c83968052b56908d6b46) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Change redirect for flow in preconstruct dev to a file with export \* because symlinks seem to be breaking

## 0.1.0

### Minor Changes

- [2f50306](https://github.com/preconstruct/preconstruct/commit/2f50306) [#88](https://github.com/preconstruct/preconstruct/pulls/88) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Remove react-native field support(note: this doesn't mean you can't build libraries for react native with preconstruct, it just means preconstruct won't make a special build for react native)

## 0.0.90

### Patch Changes

- [f1371f4](https://github.com/preconstruct/preconstruct/commit/f1371f4) [#84](https://github.com/preconstruct/preconstruct/pulls/84) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Check that all entrypoints and dist files will be included when published to npm

## 0.0.89

### Patch Changes

- [b147abd](https://github.com/preconstruct/preconstruct/commit/b147abd) - Fix TypeScript declaration generation in some cases with resolving

## 0.0.88

### Patch Changes

- [ba73086](https://github.com/preconstruct/preconstruct/commit/ba73086) - Fix typescript declaration generation in some cases

## 0.0.87

### Patch Changes

- [19d36a4](https://github.com/preconstruct/preconstruct/commit/19d36a4) - Build preconstruct with preconstruct
- [9c36a88](https://github.com/preconstruct/preconstruct/commit/9c36a88) - Allow empty bundles

## 0.0.86

### Patch Changes

- [470de81](https://github.com/preconstruct/preconstruct/commit/470de81) [#77](https://github.com/preconstruct/preconstruct/pulls/77) Thanks [@bholloway](https://github.com/bholloway)! - support windows paths

## 0.0.85

### Patch Changes

- [cec3b9f](https://github.com/preconstruct/preconstruct/commit/cec3b9f) [#75](https://github.com/preconstruct/preconstruct/pulls/75) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix TypeScript declaration file generation where a file only exports types

## 0.0.84

### Patch Changes

- [a71a4f4](https://github.com/preconstruct/preconstruct/commit/a71a4f4) - Move an internal file

## 0.0.83

### Patch Changes

- [ee8278f](https://github.com/preconstruct/preconstruct/commit/ee8278f) [#71](https://github.com/preconstruct/preconstruct/pulls/71) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Allow importing JSON (only as a default export)
- [e6f0b03](https://github.com/preconstruct/preconstruct/commit/e6f0b03) [#70](https://github.com/preconstruct/preconstruct/pulls/70) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Prompt to delete package directories that do not contain package.jsons

## 0.0.82

### Patch Changes

- [1e851be](https://github.com/preconstruct/preconstruct/commit/1e851be) [#69](https://github.com/preconstruct/preconstruct/pulls/69) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Switch symlinks in `preconstruct dev` to CommonJS re-exports to avoid issues when using Node's `--preserve-symlinks` option.

## 0.0.81

### Patch Changes

- [99f1549](https://github.com/preconstruct/preconstruct/commit/99f1549) - Remove dependency on some emotion packages that caused preconstruct to break when building emotion

## 0.0.80

### Patch Changes

- [ccc162f](https://github.com/preconstruct/preconstruct/commit/ccc162f) [#64](https://github.com/preconstruct/preconstruct/pulls/64) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Refactor logging and include package name in uncaught build errors
- [9cab2d1](https://github.com/preconstruct/preconstruct/commit/9cab2d1) [#65](https://github.com/preconstruct/preconstruct/pulls/65) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Replace internal Babel runtime helpers CJS transform from an AST transform to regex
- [df58a43](https://github.com/preconstruct/preconstruct/commit/df58a43) [#68](https://github.com/preconstruct/preconstruct/pulls/68) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add validation to disallow transitive peerDependencies where the peerDep is not specified in the direct parent
- [ff49a6d](https://github.com/preconstruct/preconstruct/commit/ff49a6d) [#66](https://github.com/preconstruct/preconstruct/pulls/66) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Create rollup externals from dependencies and peerDependencies without checking nested deps. If you get an error saying that a dependency is missing when it previously worked, you should add that package as a dependency or peerDependency.

## 0.0.79

### Patch Changes

- [525137a](https://github.com/preconstruct/preconstruct/commit/525137a) - Remove erroneous console.log

## 0.0.78

- Updated dependencies [9efd990]:
  - @preconstruct/hook@0.0.3

## 0.0.77

- Updated dependencies [aea0c36]:
  - @preconstruct/hook@0.0.2

## 0.0.76

### Patch Changes

- [ce8909b](https://github.com/preconstruct/preconstruct/commit/ce8909b) - Add file redirect instead of symlink redirect for TS in dev

## 0.0.75

### Patch Changes

- [7bade91](https://github.com/preconstruct/preconstruct/commit/7bade91) - Improve TypeScript declaration generation performance

## 0.0.74

### Patch Changes

- [f79b195](https://github.com/preconstruct/preconstruct/commit/f79b195) - Change import path generated in TypeScript declarations

## 0.0.73

### Patch Changes

- [2e01590](https://github.com/preconstruct/preconstruct/commit/2e01590) [#60](https://github.com/preconstruct/preconstruct/pulls/60) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Stop adding a postinstall script with preconstruct dev in preconstruct init. This was causing problems with single package repos so it's being removing for now.

## 0.0.72

### Patch Changes

- [cd0979f](https://github.com/preconstruct/preconstruct/commit/cd0979f) - Change TS declaration filename

## 0.0.71

### Patch Changes

- [ac2eb8a](https://github.com/preconstruct/preconstruct/commit/ac2eb8a) [#59](https://github.com/preconstruct/preconstruct/pulls/59) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add typescript declaration generation

## 0.0.70

### Patch Changes

- [423a8b6](https://github.com/preconstruct/preconstruct/commit/423a8b6) [#56](https://github.com/preconstruct/preconstruct/pulls/56) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add checks that imported modules in a package are inside of the package's directory
- [8b6e051](https://github.com/preconstruct/preconstruct/commit/8b6e051) [#58](https://github.com/preconstruct/preconstruct/pulls/58) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix entrypoints package.json creation
- [4a9de88](https://github.com/preconstruct/preconstruct/commit/4a9de88) [#57](https://github.com/preconstruct/preconstruct/pulls/57) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add .d.ts file so that TS types can be found when built

## 0.0.69

### Patch Changes

- [802fec0](https://github.com/preconstruct/preconstruct/commit/802fec0) [#54](https://github.com/preconstruct/preconstruct/pulls/54) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Replace flow file that re-exports source contents with a symlink in dev command. This fixes the problem where if you added or removed the default export of an entrypoint source file, you would have to run `preconstruct dev` again.
- [b351218](https://github.com/preconstruct/preconstruct/commit/b351218) [#55](https://github.com/preconstruct/preconstruct/pulls/55) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add support for TypeScript resolving types with dev command

## 0.0.68

### Patch Changes

- [9022265](https://github.com/preconstruct/preconstruct/commit/9022265) - Set fields in a better order

## 0.0.67

### Patch Changes

- [b22d4e1](https://github.com/preconstruct/preconstruct/commit/b22d4e1) - Fix init command prompting incorrectly for UMD builds
- [0a9b9d7](https://github.com/preconstruct/preconstruct/commit/0a9b9d7) - Remove aliases export, this is now replaced with the dev command

## 0.0.66

### Patch Changes

- [698fe38](https://github.com/preconstruct/preconstruct/commit/698fe38) [#53](https://github.com/preconstruct/preconstruct/pulls/53) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Move require hook into a package
