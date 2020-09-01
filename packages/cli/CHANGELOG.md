# preconstruct

## 1.1.27

### Patch Changes

- [`f4e9954`](https://github.com/preconstruct/preconstruct/commit/f4e9954fec700dd8467100d555df573be3be6e19) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Stop memoizing creation of TS programs for declaration generation when the tsconfig is in the package directory to allow garbage collection and prevent out of memory errors (Note that having a tsconfig per package will still be slower than having one at the root of the project since TS will be doing unnecessary repeated work)

* [`8aaec07`](https://github.com/preconstruct/preconstruct/commit/8aaec072ce6c89acddac0e79109a81fd34f6ebfa) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Correctly cache entrypoint source file resolution

## 1.1.26

### Patch Changes

- [`99090cb`](https://github.com/preconstruct/preconstruct/commit/99090cbf61fa080ed53857d7d1247bbf275a6b1b) [#312](https://github.com/preconstruct/preconstruct/pull/312) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Upgrade dependencies

## 1.1.25

### Patch Changes

- [`6b3f95e`](https://github.com/preconstruct/preconstruct/commit/6b3f95e2db4704722dc5d3c9ade64fb2d3a76965) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix bug in reading of TS config resulting in wrong type definitions being generated in some cases. This should remove the need for the experimental `useTSMorphToGenerateTSDeclarations` and `useSourceInsteadOfGeneratingTSDeclarations` flags.

## 1.1.24

### Patch Changes

- [`6727d9b`](https://github.com/preconstruct/preconstruct/commit/6727d9b0eb504a64072ddb710af570ecb7ac28c6) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add `logCompiledFiles` experimental flag for logging when files are compiled with Babel

## 1.1.23

### Patch Changes

- [`d56018d`](https://github.com/preconstruct/preconstruct/commit/d56018d6793d7298912bf2e4dc9fd92c981e7e9f) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Skip double removing of package dist directory to attempt to fix EINVAL errors on build

## 1.1.22

### Patch Changes

- [`5ad1c73`](https://github.com/preconstruct/preconstruct/commit/5ad1c73c3615ac1742b7beb8abb15680be5ad0e4) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Correctly only compile files within the package directory in the require hook for `preconstruct dev`

- Updated dependencies [[`5ad1c73`](https://github.com/preconstruct/preconstruct/commit/5ad1c73c3615ac1742b7beb8abb15680be5ad0e4)]:
  - @preconstruct/hook@0.3.0

## 1.1.21

### Patch Changes

- [`286d8fb`](https://github.com/preconstruct/preconstruct/commit/286d8fbfbe251b6c8c4f876a3dddb6ce0ecdaed9) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Make check for default exports more reliable for preconstruct dev's `.d.ts` redirect file generation

* [`b8d1906`](https://github.com/preconstruct/preconstruct/commit/b8d19066e6fa520f153497ee403d6dcd76c8edec) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Only compile files within the package directory in the require hook for `preconstruct dev`

* Updated dependencies [[`b8d1906`](https://github.com/preconstruct/preconstruct/commit/b8d19066e6fa520f153497ee403d6dcd76c8edec)]:
  - @preconstruct/hook@0.2.0

## 1.1.20

### Patch Changes

- [`a723556`](https://github.com/preconstruct/preconstruct/commit/a7235569dd4055125bb7a099c1bf4d7dba8dc1ba) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix prompt for creating entrypoint package.jsons showing every entrypoint as the package name when using `newEntrypoints` experimental flag

## 1.1.19

### Patch Changes

- [`cae339b`](https://github.com/preconstruct/preconstruct/commit/cae339b721ee0cd857e84f6454208e265be3cdc0) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix `newEntrypoints` experimental flag on Windows

## 1.1.18

### Patch Changes

- [`68fdeeb`](https://github.com/preconstruct/preconstruct/commit/68fdeebd8160a6aca9aedea027fb5f06e2e86323) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Cache source module resolution

* [`e3a5c0c`](https://github.com/preconstruct/preconstruct/commit/e3a5c0c86011b439fef65a750b0e0acbc07c65de) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Skip parsing modules with Babel to determine if they have default exports or not if we're sure they don't based on a regex when running `preconstruct dev`

## 1.1.17

### Patch Changes

- [`933d831`](https://github.com/preconstruct/preconstruct/commit/933d83165ff021a704904759b6e7004159c3322a) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix the ts-morph declaration generator generating files outside of the package's directory

## 1.1.16

### Patch Changes

- [`3c5743a`](https://github.com/preconstruct/preconstruct/commit/3c5743a86005e261671452c9bdf4b985d3a90ee3) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add experimental `useTSMorphToGenerateTSDeclarations` flag

## 1.1.15

### Patch Changes

- [`eeb0077`](https://github.com/preconstruct/preconstruct/commit/eeb007701cae285e36003f5d1c673504e045c5ef) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Use relative paths in `preconstruct dev` files

## 1.1.14

### Patch Changes

- [`0b1c19c`](https://github.com/preconstruct/preconstruct/commit/0b1c19c6af34fc639cb2a4fd6001b3d88b4506cf) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add experimental `useSourceInsteadOfGeneratingTSDeclarations` flag. This flag should not be used and is intended to be a workaround for some TypeScript declaration bugs.

## 1.1.13

### Patch Changes

- [`8e5c29d`](https://github.com/preconstruct/preconstruct/commit/8e5c29ddf0db57c3299c6c463754b8a4c6fddad7) [#281](https://github.com/preconstruct/preconstruct/pull/281) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Exclude package directories without package.jsons rather than prompting to delete them, this aligns with the behaviour of package managers.

## 1.1.12

### Patch Changes

- [`5562440`](https://github.com/preconstruct/preconstruct/commit/55624404d6e47f328a7e652b05f90ac5962c55ef) [#278](https://github.com/preconstruct/preconstruct/pull/278) Thanks [@evocateur](https://github.com/evocateur)! - Force emit when generating declaration files

## 1.1.11

### Patch Changes

- [`1833512`](https://github.com/preconstruct/preconstruct/commit/1833512c454bc7312a0ee2b79016248be13d5665) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Remove a console.log

## 1.1.10

### Patch Changes

- [`6698d62`](https://github.com/preconstruct/preconstruct/commit/6698d62a9dbda34aeff705e8bcbd9c69ec107bcc) [#275](https://github.com/preconstruct/preconstruct/pull/275) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add experimental new entrypoints feature flag (note that this should not be used and will break in patch versions)

## 1.1.9

### Patch Changes

- [`e2a8e9f`](https://github.com/preconstruct/preconstruct/commit/e2a8e9fdabf25e87fdaf398aa9863a47a3e68712) [#272](https://github.com/preconstruct/preconstruct/pull/272) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix TypeScript declaration generation with internal repo type dependencies

## 1.1.8

### Patch Changes

- [`3292d97`](https://github.com/preconstruct/preconstruct/commit/3292d9793f2408fd46245e10b3c81309b9466a77) [#264](https://github.com/preconstruct/preconstruct/pull/264) Thanks [@NateRadebaugh](https://github.com/NateRadebaugh)! - Fix type import file paths when running `preconstruct dev` to point to properly escaped paths.

* [`e34148d`](https://github.com/preconstruct/preconstruct/commit/e34148de28fbc3a368ee52ac70f67b88d8ac3520) [#266](https://github.com/preconstruct/preconstruct/pull/266) Thanks [@NateRadebaugh](https://github.com/NateRadebaugh)! - Normalize paths for declarations to fix TypeScript builds on Windows

## 1.1.7

### Patch Changes

- [`924ba9c`](https://github.com/preconstruct/preconstruct/commit/924ba9c2086d9ddf3a2aaf6db66247d53b6a453b) [#261](https://github.com/preconstruct/preconstruct/pull/261) Thanks [@Andarist](https://github.com/Andarist)! - Allow to build projects including usage of eval.

## 1.1.6

### Patch Changes

- [`5808f26`](https://github.com/preconstruct/preconstruct/commit/5808f267079155f0a1e3553ceea18272c9010fd3) [#258](https://github.com/preconstruct/preconstruct/pull/258) Thanks [@Andarist](https://github.com/Andarist)! - Fixed issue with temporarily created files (during validation) not being cleaned up correctly on validation error.

## 1.1.5

### Patch Changes

- [`5acf0ea`](https://github.com/preconstruct/preconstruct/commit/5acf0eac374ac8c462ac60b7bd16fdbdbe528fe8) [#252](https://github.com/preconstruct/preconstruct/pull/252) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Upgrade Rollup and related packages

* [`a238788`](https://github.com/preconstruct/preconstruct/commit/a2387881924425d614c256a521527417d641e011) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix source option not being written

## 1.1.4

### Patch Changes

- [`e50769a`](https://github.com/preconstruct/preconstruct/commit/e50769a843f827292bdf94dd52cb26be31f0fc1c) [#239](https://github.com/preconstruct/preconstruct/pull/239) Thanks [@mrmartineau](https://github.com/mrmartineau) - Improve error message when attempting to create a TypeScript declaration file for a non-TypeScript file

- [`fd875bb`](https://github.com/preconstruct/preconstruct/commit/fd875bbf6bf5fddc79c195a90c3804d6c2bfde57) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Update npm-packlist to fix bug where npm-normalize-package-bin wasn't specified in the dependencies of npm-packlist

## 1.1.3

### Patch Changes

- [`3098cfc`](https://github.com/preconstruct/preconstruct/commit/3098cfc5a26cccc7b051c417cee164b216ff6f84) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Improve error when a package.json is invalid JSON

## 1.1.2

### Patch Changes

- [`1e37a5d`](https://github.com/preconstruct/preconstruct/commit/1e37a5de036ca4f897c990457676c33a6ae287bc) [#228](https://github.com/preconstruct/preconstruct/pull/228) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Batch build errors together

## 1.1.1

### Patch Changes

- [`c1cfc05`](https://github.com/preconstruct/preconstruct/commit/c1cfc0503f73a197487d6cba6ada607fe957f527) [#226](https://github.com/preconstruct/preconstruct/pull/226) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fixed global prompt never showing up and get each global lazily so that peerDependencies which are never imported are not required to have a global

## 1.1.0

### Minor Changes

- [`b2e1118`](https://github.com/preconstruct/preconstruct/commit/b2e1118b47037d6d2fb03eef39aeaeceec2d20e5) [#224](https://github.com/preconstruct/preconstruct/pull/224) Thanks [@Andarist](https://github.com/Andarist)! - Rewrite references to @babel/runtime helpers when they are externalized in ESM builds.

## 1.0.2

### Patch Changes

- [`37ff280`](https://github.com/preconstruct/preconstruct/commit/37ff2804057d4c214f47a0ab8d0bd1c7403f3525) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Add README to package

## 1.0.1

### Patch Changes

- [`887349e`](https://github.com/preconstruct/preconstruct/commit/887349ef4d1d8d1c9e91c032ecd1c6cc1c220772) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Replace `rollup-plugin-alias` with `@rollup/plugin-alias` and `rollup-plugin-replace` with `@rollup/plugin-replace`

## 1.0.0

### Major Changes

- [`c4886ea`](https://github.com/preconstruct/preconstruct/commit/c4886ea432a839291437c3346ddc6253b462c918) [#218](https://github.com/preconstruct/preconstruct/pull/218) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Rename package to @preconstruct/cli

### Minor Changes

- [`0ac7b7f`](https://github.com/preconstruct/preconstruct/commit/0ac7b7fd34cf3589c62e1cf94a9b9488e8e3bf85) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Stop prompting to create browser build because people often don't want it/it isn't useful for most cases. Note that support for the field hasn't been removed, you can still add the field manually

### Patch Changes

- [`c4886ea`](https://github.com/preconstruct/preconstruct/commit/c4886ea432a839291437c3346ddc6253b462c918) [#218](https://github.com/preconstruct/preconstruct/pull/218) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Fix TypeScript declaration generation in TypeScript 3.7

* [`7dd4014`](https://github.com/preconstruct/preconstruct/commit/7dd4014bded6f747db8b0e0a5eb9fa04f5f9d67e) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Improve error messages

- [`8e5635d`](https://github.com/preconstruct/preconstruct/commit/8e5635db58e231cefdd686fe315f0af32c47b1ca) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Mention errors page when an error occurs

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
