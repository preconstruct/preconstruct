# preconstruct

## 0.0.0-test-20241108011831

### Patch Changes

- [#612](https://github.com/preconstruct/preconstruct/pull/612) [`741707c`](https://github.com/preconstruct/preconstruct/commit/741707caa420e2ac5f781f893bb57ca9c10c7851) Thanks [@emmatown](https://github.com/emmatown)! - Fix `preconstruct watch` when using `use client`/`use server` directives

## 2.8.9

### Patch Changes

- [#604](https://github.com/preconstruct/preconstruct/pull/604) [`79b6d1c`](https://github.com/preconstruct/preconstruct/commit/79b6d1cc75151c35fea48095034dc2c7b36b77e6) Thanks [@emmatown](https://github.com/emmatown)! - Fix outputting `.d.ts` files with extension-less imports that are invalid when using the experimental flag `typeModule` with `moduleResolution: "nodenext"` and `type: "module"` in `dev` and `build`

## 2.8.8

### Patch Changes

- [#599](https://github.com/preconstruct/preconstruct/pull/599) [`4b920e7`](https://github.com/preconstruct/preconstruct/commit/4b920e77384f9950063dc25047b839d2c1ed00d7) Thanks [@VanTanev](https://github.com/VanTanev)! - Remove unnecessary dependency on `meow` CLI parsing library, as @preconstruct/cli only takes a single positional argument denoting a preconstruct command.

- [#602](https://github.com/preconstruct/preconstruct/pull/602) [`b62bd19`](https://github.com/preconstruct/preconstruct/commit/b62bd192465a7e0cef190732fb06c230efcae1fa) Thanks [@emmatown](https://github.com/emmatown)! - Fix referencing a type from another package in the same preconstruct build that has a `.d.ts` file at the entrypoint

## 2.8.7

### Patch Changes

- [#596](https://github.com/preconstruct/preconstruct/pull/596) [`022bbc4`](https://github.com/preconstruct/preconstruct/commit/022bbc4487587ab9600017b7d619e8616cd57e88) Thanks [@emmatown](https://github.com/emmatown)! - Fix `Error when using sourcemap for reporting an error: Can't resolve original location of error` error caused by changes to `@babel/helpers` in newer versions of Babel

## 2.8.6

### Patch Changes

- [#594](https://github.com/preconstruct/preconstruct/pull/594) [`9f45824`](https://github.com/preconstruct/preconstruct/commit/9f45824d1da261a68c396ead71eaeeef4ea92144) Thanks [@emmatown](https://github.com/emmatown)! - Add `checkTypeDependencies` experimental flag

## 2.8.5

### Patch Changes

- [#592](https://github.com/preconstruct/preconstruct/pull/592) [`c05b2a9`](https://github.com/preconstruct/preconstruct/commit/c05b2a9e579bb5e1f46a8616220645f6e600db28) Thanks [@emmatown](https://github.com/emmatown)! - Fix generating TypeScript declarations where imports to JSON files are emitted in the `.d.ts` files

## 2.8.4

### Patch Changes

- [`fa66c34`](https://github.com/preconstruct/preconstruct/commit/fa66c3496745ed186bfa0884e1a71c9107cf6612) Thanks [@emmatown](https://github.com/emmatown)! - Fix `preconstruct dev` with `exports: { importConditionDefaultExport: "default" }` with a `.d.ts` file

## 2.8.3

### Patch Changes

- [#586](https://github.com/preconstruct/preconstruct/pull/586) [`d8e9cea`](https://github.com/preconstruct/preconstruct/commit/d8e9cea1a7d74fc2ee7eb78fdea1aed64051f370) Thanks [@emmatown](https://github.com/emmatown)! - Add `typeModule` experimental flag

- [#586](https://github.com/preconstruct/preconstruct/pull/586) [`d8e9cea`](https://github.com/preconstruct/preconstruct/commit/d8e9cea1a7d74fc2ee7eb78fdea1aed64051f370) Thanks [@emmatown](https://github.com/emmatown)! - Add `distInRoot` experimental flag

- [#588](https://github.com/preconstruct/preconstruct/pull/588) [`1a2ee56`](https://github.com/preconstruct/preconstruct/commit/1a2ee56d557de074b21597ccd52878087298e02a) Thanks [@emmatown](https://github.com/emmatown)! - Use inline source maps for declaration file redirects

## 2.8.2

### Patch Changes

- [#584](https://github.com/preconstruct/preconstruct/pull/584) [`d79abf2`](https://github.com/preconstruct/preconstruct/commit/d79abf2c78f01c2bfbd50a5288242469defbc630) Thanks [@emmatown](https://github.com/emmatown)! - Fix `.d.cts`/`.d.mts` files breaking declaration generation

* [#570](https://github.com/preconstruct/preconstruct/pull/570) [`edb4320`](https://github.com/preconstruct/preconstruct/commit/edb4320bc2355c0e61060a8c21b821d02e9535ca) Thanks [@Andarist](https://github.com/Andarist)! - Replace the dependency `is-ci` with `ci-info`.

## 2.8.1

### Patch Changes

- [#567](https://github.com/preconstruct/preconstruct/pull/567) [`d4006c8`](https://github.com/preconstruct/preconstruct/commit/d4006c8b550a165ed4153527e7b07ffdea9ae68d) Thanks [@Andarist](https://github.com/Andarist)! - Fixed `.mjs` proxies generation with `___experimentalFlags_WILL_CHANGE_IN_PATCH.importsConditions` and `exports.importConditionDefaultExport: 'default'`

## 2.8.0

### Minor Changes

- [#565](https://github.com/preconstruct/preconstruct/pull/565) [`484c6a7`](https://github.com/preconstruct/preconstruct/commit/484c6a7306236d741a89f7ca6ddef7ff60799f7e) Thanks [@Andarist](https://github.com/Andarist)! - `package.json#exports` have been added to limit what (and how) code might be imported from the package.

* [#566](https://github.com/preconstruct/preconstruct/pull/566) [`9d4f0dc`](https://github.com/preconstruct/preconstruct/commit/9d4f0dccb1a5e6af79cd7e9fa253fc127eb14489) Thanks [@emmatown](https://github.com/emmatown)! - Preconstruct no longer emits unnecessary `.d.ts` files that aren't referenced by an entrypoint

### Patch Changes

- [`58df49f`](https://github.com/preconstruct/preconstruct/commit/58df49f057361be69aa9d7a91ff8b36efaf9d4d8) Thanks [@emmatown](https://github.com/emmatown)! - Fix require hook skipping compiling files when just an entrypoint is loaded

* [#559](https://github.com/preconstruct/preconstruct/pull/559) [`a58f021`](https://github.com/preconstruct/preconstruct/commit/a58f021a79fa93208beb8b351fd17522de6dbcda) Thanks [@emmatown](https://github.com/emmatown)! - Extend import path normalisation in generated declaration files to manually written declaration files as well

## 2.7.0

### Minor Changes

- [#556](https://github.com/preconstruct/preconstruct/pull/556) [`908c43e`](https://github.com/preconstruct/preconstruct/commit/908c43ec4c291eff6bcb4365d6b97887bc8637bb) Thanks [@Andarist](https://github.com/Andarist)! - Always emit relative paths used in generated TS declaration files with resolved extensions of their runtime equivalents. This currently requires one of the 2 experimental flags: `importsConditions` or `onlyEmitUsedTypeScriptDeclarations`

### Patch Changes

- [#554](https://github.com/preconstruct/preconstruct/pull/554) [`1147fee`](https://github.com/preconstruct/preconstruct/commit/1147fee9cf6ee0a4d1174114c979f59bb531eb93) Thanks [@Andarist](https://github.com/Andarist)! - Fix types like `import('#foo').Foo<import('#bar').Bar>` not replacing the import to `#bar` in generated declarations under the `importsConditions` experimental flag

## 2.6.4

### Patch Changes

- [`e78203b`](https://github.com/preconstruct/preconstruct/commit/e78203b101beb3e4e22ebaaf0d4bc55f36e91429) Thanks [@emmatown](https://github.com/emmatown)! - Fix `.d.ts` files under `importsConditions` experimental flag incorrectly pointing to the source files

## 2.6.3

### Patch Changes

- [#551](https://github.com/preconstruct/preconstruct/pull/551) [`ff61fbf`](https://github.com/preconstruct/preconstruct/commit/ff61fbf095f67fe4f4a883969d156e563c84249a) Thanks [@emmatown](https://github.com/emmatown)! - Add `importsConditions` experimental flag

* [#550](https://github.com/preconstruct/preconstruct/pull/550) [`41a8a4f`](https://github.com/preconstruct/preconstruct/commit/41a8a4fbbd7bf18ca13f7719090cc19fc1b7b63e) Thanks [@emmatown](https://github.com/emmatown)! - Add `onlyEmitUsedTypeScriptDeclarations` experimental flag

- [#548](https://github.com/preconstruct/preconstruct/pull/548) [`db69133`](https://github.com/preconstruct/preconstruct/commit/db691338dc0dc6716c9614673cad69ba7aec1567) Thanks [@Andarist](https://github.com/Andarist)! - Load Babel lazily in the main thread to speed up init time as it isn't needed for all code paths.

## 2.6.2

### Patch Changes

- [#546](https://github.com/preconstruct/preconstruct/pull/546) [`c28b10a`](https://github.com/preconstruct/preconstruct/commit/c28b10a04b3d3a88b8957cab8f0ead8c08d2cb17) Thanks [@emmatown](https://github.com/emmatown)! - `importConditionDefaultExport` is now re-enabled and works with `"moduleResolution": "bundler"`

## 2.6.1

### Patch Changes

- [`5380890`](https://github.com/preconstruct/preconstruct/commit/538089009c687e876a868cd5379c2d96b8c04a97) Thanks [@emmatown](https://github.com/emmatown)! - Disable specifying `importConditionDefaultExport` because it doesn't work correctly in `"moduleResoltion": "bundler"`, `@preconstruct/cli@2.6.0` is npm deprecated, `importConditionDefaultExport` will come back in the future.

## 2.6.0

### Minor Changes

- [#543](https://github.com/preconstruct/preconstruct/pull/543) [`93106e3`](https://github.com/preconstruct/preconstruct/commit/93106e3dd75d579bf48dbce5cb8d942ed8ab34ef) Thanks [@Andarist](https://github.com/Andarist)! - Added a new `exports.importConditionDefaultExport` config option. It allows you to generate `import` exports condition (and corresponding files) to fix the export shape incompatibility between node and bundlers.

  With this option set to `"default"` this will always resolve to what has been written as a default export:

  ```ts
  // lib/src/index.js
  export default 42;
  export const named = "awesome";

  // app/consume.mjs
  import smth from "lib";
  smth; // 42, and not `{ default: 42, named: 'awesome' }`
  ```

* [`233ee25`](https://github.com/preconstruct/preconstruct/commit/233ee252c052c187c66889e03ccffd791e46e741) Thanks [@emmatown](https://github.com/emmatown)! - Top-level `'use server'` directives are now also preserved like `'use client'` directives.

### Patch Changes

- [`4e72d99`](https://github.com/preconstruct/preconstruct/commit/4e72d99e708e12a06486c62de5507c2a1dedf2f5) Thanks [@emmatown](https://github.com/emmatown)! - Fix `'use client'` directives with comments preceding them not being detected

## 2.5.0

### Minor Changes

- [#540](https://github.com/preconstruct/preconstruct/pull/540) [`261140b`](https://github.com/preconstruct/preconstruct/commit/261140ba55fa1438e87b14509ee50c999475b8f4) Thanks [@emmatown](https://github.com/emmatown)! - Self-referencing a package with its name is now allowed. They are emitted as written (not resolved to a particular bundle ahead of time).

### Patch Changes

- [#538](https://github.com/preconstruct/preconstruct/pull/538) [`d2cd411`](https://github.com/preconstruct/preconstruct/commit/d2cd411b343b42aa1ae5a30dd7d72b99fa75165d) Thanks [@emmatown](https://github.com/emmatown)! - Update rollup and magic-string

* [#541](https://github.com/preconstruct/preconstruct/pull/541) [`2fd4ed2`](https://github.com/preconstruct/preconstruct/commit/2fd4ed2f1a35e587908eb2c8883da59e9a5df608) Thanks [@emmatown](https://github.com/emmatown)! - Fix issues with `'use client'` directive module preservation

- [#536](https://github.com/preconstruct/preconstruct/pull/536) [`3645eed`](https://github.com/preconstruct/preconstruct/commit/3645eedf0fec94ab16e8464f244458b03ae95e2e) Thanks [@jordanoverbye](https://github.com/jordanoverbye)! - Upgraded dependency `terser`

## 2.4.4

### Patch Changes

- [`1f83965`](https://github.com/preconstruct/preconstruct/commit/1f83965ff004a84c585a3fde6bb866d6f7f026cd) Thanks [@emmatown](https://github.com/emmatown)! - Fix `preconstruct dev` throwing a syntax error when an entrypoint has a `.d.ts` file with a default export.

## 2.4.3

### Patch Changes

- [`7f6618a`](https://github.com/preconstruct/preconstruct/commit/7f6618a8209e3bfa256c148f03c09bcd5c8881f7) Thanks [@emmatown](https://github.com/emmatown)! - Remove comment for `preconstruct dev` TypeScript re-export file

## 2.4.2

### Patch Changes

- [#530](https://github.com/preconstruct/preconstruct/pull/530) [`2a3722c`](https://github.com/preconstruct/preconstruct/commit/2a3722c41fce82ec269b63967e2a23b609f8799a) Thanks [@emmatown](https://github.com/emmatown)! - Generate declaration maps for the `.d.ts` files that only re-export the actual entrypoints so that go to definition goes directly to the actual entrypoints.

## 2.4.1

### Patch Changes

- [`457b707`](https://github.com/preconstruct/preconstruct/commit/457b707722051219165bb39e673e0b1f3dfdfafd) Thanks [@emmatown](https://github.com/emmatown)! - Fix having a `"use client"` in a non-entrypoint TypeScript file breaking the build

## 2.4.0

### Minor Changes

- [#516](https://github.com/preconstruct/preconstruct/pull/516) [`d363c88`](https://github.com/preconstruct/preconstruct/commit/d363c880e462758f32e899eb1984d59a4f0cdb8d) Thanks [@emmatown](https://github.com/emmatown)! - Modules with `"use client"` directives are now built as their own chunk with the `"use client"` directive preserved.

## 2.3.0

### Minor Changes

- [#508](https://github.com/preconstruct/preconstruct/pull/508) [`36e3d51`](https://github.com/preconstruct/preconstruct/commit/36e3d51bd1e2619cfecc3af53dcb19b2d0fbcb08) Thanks [@emmatown](https://github.com/emmatown)! - [Support for the exports field](https://preconstruct.tools/configuration#exports) has been stabilised. If you were using the experimental flag, you should remove it.

### Patch Changes

- [#512](https://github.com/preconstruct/preconstruct/pull/512) [`09784cd`](https://github.com/preconstruct/preconstruct/commit/09784cd5741c27593433b393faae6e3dc64d63b1) Thanks [@emmatown](https://github.com/emmatown)! - Removed `typeScriptProxyFileWithImportEqualsRequireAndExportEquals` experimental flag.

## 2.2.2

### Patch Changes

- [#495](https://github.com/preconstruct/preconstruct/pull/495) [`4e90c2b`](https://github.com/preconstruct/preconstruct/commit/4e90c2bb282663f29e739f9530a5efbcd8dfc694) Thanks [@mycroes](https://github.com/mycroes)! - The `outDir` and `declarationDir` tsconfig options are now ignored. These options are unnecessary for Preconstruct since it controls where the `.d.ts` files are emitted to. This fixes confusing errors if you had these options set.

* [`eaa2fcc`](https://github.com/preconstruct/preconstruct/commit/eaa2fcc0924ccebb40bbb69a2a3a2eb6063552c7) Thanks [@emmatown](https://github.com/emmatown)! - Improved error when importing something with an extension that can't be imported

## 2.2.1

### Patch Changes

- [#476](https://github.com/preconstruct/preconstruct/pull/476) [`3930466`](https://github.com/preconstruct/preconstruct/commit/3930466067f3ff03c332706fe8ab82beaec2235a) Thanks [@emmatown](https://github.com/emmatown)! - Using `node:` to import Node builtins no longer triggers a "package is not specified in dependencies or peerDependencies" error

* [#481](https://github.com/preconstruct/preconstruct/pull/481) [`76f0163`](https://github.com/preconstruct/preconstruct/commit/76f0163e833d1454dcd34bc378d7b6500f99d55b) Thanks [@efoken](https://github.com/efoken)! - Updated `@rollup/plugin-node-resolve` to `^11.2.1` in order to make direct imports resolveable, e.g. packages that use `exports` in their package.json

## 2.2.0

### Minor Changes

- [#474](https://github.com/preconstruct/preconstruct/pull/474) [`a05414d`](https://github.com/preconstruct/preconstruct/commit/a05414d064e0bda75da47c9d3eaed9d713bae8f1) Thanks [@emmatown](https://github.com/emmatown)! - `.d.ts` files can now be written next to `.js` entrypoints and they will be appropriately written to the dist.

## 2.1.8

### Patch Changes

- [#435](https://github.com/preconstruct/preconstruct/pull/435) [`014038b`](https://github.com/preconstruct/preconstruct/commit/014038b1049be52a8755c37723d931997b13da04) Thanks [@nicksrandall](https://github.com/nicksrandall)! - Added experimental `exports` flag. See the docs at the `exports` section of https://preconstruct.tools/configuration.

## 2.1.7

### Patch Changes

- [`3f202fd`](https://github.com/preconstruct/preconstruct/commit/3f202fd78c233093c483b0bb8fc657ecde1a4df7) Thanks [@emmatown](https://github.com/emmatown)! - Imports to `@babel/runtime/helpers/esm/*` will now be rewritten to `@babel/runtime/helpers/*` for CommonJS outputs. This fixes the CommonJS output in case you have `["@babel/plugin-transform-runtime", { "useESModules": true }]`) in your Babel config.

## 2.1.6

### Patch Changes

- [#461](https://github.com/preconstruct/preconstruct/pull/461) [`97e7ca0`](https://github.com/preconstruct/preconstruct/commit/97e7ca066f97b81ef986945e5363e95c6c1f867d) Thanks [@simonswiss](https://github.com/simonswiss)! - Fixed grammar in CLI info message about errors

* [`f6f2e60`](https://github.com/preconstruct/preconstruct/commit/f6f2e605e74b18b84f6734ba8c7a58ce24703a34) Thanks [@emmatown](https://github.com/emmatown)! - Fixed bigint usage causing an error

## 2.1.5

### Patch Changes

- [`ad15ffa`](https://github.com/preconstruct/preconstruct/commit/ad15ffa5c08f49781cb7932cc2dd6a17b73b8863) Thanks [@emmatown](https://github.com/emmatown)! - Fixed resolving `typescript` package when using Yarn PnP and installing `typescript` at the root of a project

## 2.1.4

### Patch Changes

- [`7c730bd`](https://github.com/preconstruct/preconstruct/commit/7c730bd191f6262c901e6d8f4fb45d121f9c85c5) [#415](https://github.com/preconstruct/preconstruct/pull/415) Thanks [@emmatown](https://github.com/emmatown)! - Fixed generating TypeScript declarations when a JSON file is imported from a TypeScript file.

## 2.1.3

### Patch Changes

- [`73d4838`](https://github.com/preconstruct/preconstruct/commit/73d483802254b8c9761b649654babc434426f4b8) [#413](https://github.com/preconstruct/preconstruct/pull/413) Thanks [@namjul](https://github.com/namjul)! - Fixed logger failing when an unexpected type is received

## 2.1.2

### Patch Changes

- [`ce31841`](https://github.com/preconstruct/preconstruct/commit/ce318415906a2fe50888b847a6207ca2402c4dd1) [#411](https://github.com/preconstruct/preconstruct/pull/411) Thanks [@emmatown](https://github.com/emmatown)! - Fixed generating declaration maps with versions of TypeScript 4.3 and above.

  Errors are now also emitted when TypeScript fails to generate declarations because it needs to reference a type that isn't exported. Previously Preconstruct silently generated a broken declaration file when encountering inputs like the one shown below where TypeScript needs to be able to name the type `X` when generating the `d.ts` file for `index.ts` but it isn't exported, now it will emit an error instead. To fix the error, you need to export the type.

  ```ts
  // @filename: index.ts
  import { getX } from "./x";

  export const x = getX();

  // @filename: x.ts
  type X = {
    x?: X;
  };

  export const getX = (): X => ({});
  ```

  Note that Preconstruct still does not run TypeScript's type checking, you should still do that in addition to running Preconstruct, Preconstruct will only emit these specific errors.

## 2.1.1

### Patch Changes

- [`adcca78`](https://github.com/preconstruct/preconstruct/commit/adcca7878979f2bff7f5957c02a470884edf3adf) Thanks [@emmatown](https://github.com/emmatown)! - Fixed issues around `ERR_PACKAGE_PATH_NOT_EXPORTED` errors when resolving the location of dependencies' package.jsons with UMD builds

## 2.1.0

### Minor Changes

- [`f798f04`](https://github.com/preconstruct/preconstruct/commit/f798f04f610d5bdfb8ae434cd70ba1f46477f886) [#393](https://github.com/preconstruct/preconstruct/pull/393) Thanks [@with-heart](https://github.com/with-heart)! - Added support for the `tsconfig.declarationMap` option. `preconstruct` now outputs both `d.ts` and `d.ts.map` files to `dist/declarations/src` when the option is enabled.

## 2.0.7

### Patch Changes

- [`eee1b6e`](https://github.com/preconstruct/preconstruct/commit/eee1b6e825dd0e7f7826ee846433af9defe511fd) [#383](https://github.com/preconstruct/preconstruct/pull/383) Thanks [@emmatown](https://github.com/emmatown)! - Add `keepDynamicImportAsDynamicImportInCommonJS` experimental flag to allow importing Node ESM-only packages in Preconstruct packages. This can be used to ship a package that can be both imported and required and has a dependency that doesn't have a CommonJS distribution.

  Note that `import()` is asynchronous so it won't be possible to get access to such ESM-only dependency synchronously.

## 2.0.6

### Patch Changes

- [`d1feb8e`](https://github.com/preconstruct/preconstruct/commit/d1feb8e40c6596faa928470f1021b0a541221e26) [#376](https://github.com/preconstruct/preconstruct/pull/376) Thanks [@Andarist](https://github.com/Andarist)! - Fixed the `watch` command not clearing dev links of additional entrypoints correctly and creating an infinite loop because of this.

## 2.0.5

### Patch Changes

- [`3c30480`](https://github.com/preconstruct/preconstruct/commit/3c3048083b0a92e8e8e1553489f1f813eaac860a) [#372](https://github.com/preconstruct/preconstruct/pull/372) Thanks [@emmatown](https://github.com/emmatown)! - Set `preventAssignment` on `@rollup/plugin-replace` to stop browser builds failing to build.

## 2.0.4

### Patch Changes

- [`87e8713`](https://github.com/preconstruct/preconstruct/commit/87e871399483b5687cd28bb1829cd355b31ce59f) [#295](https://github.com/preconstruct/preconstruct/pull/295) Thanks [@Andarist](https://github.com/Andarist)! - Fixed destination paths of generated "local dependency" `.d.ts` files (for files other than `src/index.ts`) in TypeScript projects on Windows.

## 2.0.3

### Patch Changes

- [`a41034d`](https://github.com/preconstruct/preconstruct/commit/a41034d26e0f675d3b9f452ded490276306bb402) [#366](https://github.com/preconstruct/preconstruct/pull/366) Thanks [@Andarist](https://github.com/Andarist)! - Fixed destination paths of generated `.d.ts` files in TypeScript projects on Windows.

## 2.0.2

### Patch Changes

- [`1451fc4`](https://github.com/preconstruct/preconstruct/commit/1451fc43cdb68701ddab53a8308efe77ad1b186b) Thanks [@emmatown](https://github.com/emmatown)! - Fix UMD builds where files contain typeof window/document and process.env.NODE_ENV

* [`e3b4196`](https://github.com/preconstruct/preconstruct/commit/e3b419663e45b6b2d1de7170b9c1095f7e908eaf) [#358](https://github.com/preconstruct/preconstruct/pull/358) Thanks [@emmatown](https://github.com/emmatown)! - Improvements to Babel helper generation so that @babel/runtime(and the core-js versions) is automatically used when it is a dependency even without @babel/plugin-transform-runtime including using all of the available helpers in the version of @babel/runtime that is specified as a dependency(without Preconstruct, unless you specify the version of @babel/runtime that you use in @babel/plugin-transform-runtime, Babel helpers that aren't available in the oldest version of @babel/runtime will be inlined rather than imported from @babel/runtime).

- [`1451fc4`](https://github.com/preconstruct/preconstruct/commit/1451fc43cdb68701ddab53a8308efe77ad1b186b) Thanks [@emmatown](https://github.com/emmatown)! - Fix UMD builds where external dependencies contain process.env.NODE_ENV

* [`93acf0c`](https://github.com/preconstruct/preconstruct/commit/93acf0c57e235b256d1af4e84d36cf8720168574) Thanks [@emmatown](https://github.com/emmatown)! - Remove an unnecessary parse

- [`fe57d4c`](https://github.com/preconstruct/preconstruct/commit/fe57d4cda81a373041fcd29e94a3a7bdf7d6422d) Thanks [@emmatown](https://github.com/emmatown)! - Improve TypeScript declaration generation performance by only creating a single program per TS project rather than one per package

## 2.0.1

### Patch Changes

- [`4afde4e`](https://github.com/preconstruct/preconstruct/commit/4afde4e6e57b31a06c45831b18f456c46b5abff3) Thanks [@emmatown](https://github.com/emmatown)! - Add `typeScriptProxyFileWithImportEqualsRequireAndExportEquals` experimental flag

* [`c2a9918`](https://github.com/preconstruct/preconstruct/commit/c2a9918ee73f5900f6c5b9a96c2efd94299ab416) Thanks [@emmatown](https://github.com/emmatown)! - Fix entrypoint glob check on Windows

## 2.0.0

### Major Changes

- [`9ac1df4`](https://github.com/preconstruct/preconstruct/commit/9ac1df42b73fa39b91ce18b9e9bf62872c29c0e6) Thanks [@emmatown](https://github.com/emmatown)! - Change the way entrypoints are configured. Instead of the entrypoints option referring to the entrypoint directories, they new refer to entrypoint source files. They are resolved relative to the `src` directory of the package. To get the entrypoint directory from a source file, the extension is removed from the path relative to the `src` directory and if the last part is `index`, the `index` part is removed. For example, an entrypoint of `something.js` would create an entrypoint at `pkg-name/something` and `another/index.js` would create an entrypoint at `pkg-name/another`.

  `preconstruct fix` will also now automatically create the entrypoint `package.json`s because it already knows where the source file is.

  For example, a package that looks like the following in `@preconstruct/cli@1`

  `package.json`

  ```json
  {
    "name": "pkg",
    "main": "dist/pkg.cjs.js",
    "preconstruct": {
      "entrypoints": [".", "other"]
    }
  }
  ```

  `src/index.js`

  ```js
  export const something = true;
  ```

  `src/other.js`

  ```js
  export const other = true;
  ```

  `other/package.json`

  ```json
  {
    "main": "dist/pkg.cjs.js",
    "preconstruct": {
      "source": "../src/other.js"
    }
  }
  ```

  Would need the following changes to work in `@preconstruct/cli@2`

  `package.json`

  ```diff
   {
     "name": "pkg",
     "main": "dist/pkg.cjs.js",
     "preconstruct": {
  -    "entrypoints": [".", "other"]
  +    "entrypoints": ["index.js", "other.js"]
     }
   }
  ```

  `other/package.json`

  ```diff
   {
     "main": "dist/pkg.cjs.js",
  -  "preconstruct": {
  -    "source": "../src/other.js"
  -  }
   }
  ```

* [`9ac1df4`](https://github.com/preconstruct/preconstruct/commit/9ac1df42b73fa39b91ce18b9e9bf62872c29c0e6) Thanks [@emmatown](https://github.com/emmatown)! - Change the way that `process.env.NODE_ENV` is replaced in the production CJS bundle to search for `process.env.NODE_ENV` in the AST and replace it rather than using Terser to replace it and also skip running Terser on the production CJS bundle and instead rely on Rollup's dead code elimination to improve build performance. It's extremely unlikely that this will break anything but this is being made in a major release just in case it does.

- [`9ac1df4`](https://github.com/preconstruct/preconstruct/commit/9ac1df42b73fa39b91ce18b9e9bf62872c29c0e6) Thanks [@emmatown](https://github.com/emmatown)! - Change default dist filename strategy to include the scope and entrypoint path. For example, with an entrypoint accessible at `@scope/pkg/entrypoint`, the CJS dist filename would be `scope-pkg-entrypoint.cjs.js`. If you'd like to use the old dist filenames, you can set `"distFilenameStrategy": "unscoped-package-name"` in your root Preconstruct config.

* [`dd0f041`](https://github.com/preconstruct/preconstruct/commit/dd0f04103faffb4ec43e1b519c356de8e344003f) Thanks [@emmatown](https://github.com/emmatown)! - Use fast-glob directly instead of globby. This _shouldn't_ break anything but because using fast-glob directly instead of globby may have subtly different behaviour, this is being done in a major version.

### Patch Changes

- [`027e44d`](https://github.com/preconstruct/preconstruct/commit/027e44d8722d4731b43137fa240b76a084e335b8) Thanks [@emmatown](https://github.com/emmatown)! - Remove the `useSourceInsteadOfGeneratingTSDeclarations` and `useTSMorphToGenerateTSDeclarations` experimental flags as the TypeScript declaration generator no longer has the issues that these experimental flags tried to solve

* [`20902dc`](https://github.com/preconstruct/preconstruct/commit/20902dcb30cd9035aa79282b2b2eceb1421c9efb) Thanks [@emmatown](https://github.com/emmatown)! - Use symlinks instead of CJS re-export files for "module" and "browser" field when using `preconstruct dev`.

## 1.2.1

### Patch Changes

- [`620e71f`](https://github.com/preconstruct/preconstruct/commit/620e71fe846fe8396bf6bb77ebdcabaaa9ee4c2a) [#344](https://github.com/preconstruct/preconstruct/pull/344) Thanks [@emmatown](https://github.com/emmatown)! - Make `preconstruct fix` automatically create entrypoint package.jsons rather than asking if it should create them with the new entrypoints experimental flag

* [`620e71f`](https://github.com/preconstruct/preconstruct/commit/620e71fe846fe8396bf6bb77ebdcabaaa9ee4c2a) [#344](https://github.com/preconstruct/preconstruct/pull/344) Thanks [@emmatown](https://github.com/emmatown)! - Rename `only-unscoped-package-name` to `unscoped-package-name` in the `distFilenameStrategy` option(which is only enabled when the experimental `newDistFilenames` flag is enabled)

## 1.2.0

### Minor Changes

- [`3c031da`](https://github.com/preconstruct/preconstruct/commit/3c031da27fb051423d0b2bfb6c5615ac55625079) [#343](https://github.com/preconstruct/preconstruct/pull/343) Thanks [@Andarist](https://github.com/Andarist)! - Respect `package.json#browser` when bundling dependencies for the UMD build.

### Patch Changes

- [`a198073`](https://github.com/preconstruct/preconstruct/commit/a198073c95501517112f77fe3dd9c730ebb81dcc) [#340](https://github.com/preconstruct/preconstruct/pull/340) Thanks [@Andarist](https://github.com/Andarist)! - Allow to build UMD files for packages having dependencies with top-level `this` in ESM files. This can often happen if a dependency package is transpiled down to ES5 using TypeScript.

## 1.1.34

### Patch Changes

- [`be053e7`](https://github.com/preconstruct/preconstruct/commit/be053e75d6b2793ee220f537eb0506a948874fea) [#337](https://github.com/preconstruct/preconstruct/pull/337) Thanks [@emmatown](https://github.com/emmatown)! - Add `newDistFilenames` experimental flag

## 1.1.33

### Patch Changes

- [`cef98e9`](https://github.com/preconstruct/preconstruct/commit/cef98e9d82fc12d044352d5d0c8e5a3e23828a4e) Thanks [@emmatown](https://github.com/emmatown)! - Revert change from globby to fast-glob because fast-glob doesn't directly support negations

## 1.1.32

### Patch Changes

- [`3944e88`](https://github.com/preconstruct/preconstruct/commit/3944e88feff8ff6943f24be465e6ba9d9f96c09a) [#333](https://github.com/preconstruct/preconstruct/pull/333) Thanks [@emmatown](https://github.com/emmatown)! - Add `newProcessEnvNodeEnvReplacementStrategyAndSkipTerserOnCJSProdBuild` experimental flag

## 1.1.31

### Patch Changes

- [`b79bb61`](https://github.com/preconstruct/preconstruct/commit/b79bb614f2952fa60ec9c14e87bd4953aad06bb2) Thanks [@emmatown](https://github.com/emmatown)! - Skip unnecessary repeated module resolution when doing a build (this won't make a very noticable difference for projects with a small amount of packages and entrypoints but will for projects with a large amount of packages and entrypoint)

* [`4e0d249`](https://github.com/preconstruct/preconstruct/commit/4e0d249988e375059765d410996f94f936fe24df) Thanks [@emmatown](https://github.com/emmatown)! - Revert change in `@preconstruct/cli@1.1.30` that skips unregistering the require hook in the code generated by `preconstruct dev` because not unregistering the hook caused some issues when using Preconstruct to build a Babel plugin.

- [`b79bb61`](https://github.com/preconstruct/preconstruct/commit/b79bb614f2952fa60ec9c14e87bd4953aad06bb2) Thanks [@emmatown](https://github.com/emmatown)! - Only generate the Babel helpers that are used and not imported from `@babel/runtime` along with only generating and parsing them once rather than per package (note that unused helpers were already removed from the bundles, this is just a performance improvement when doing a build)

## 1.1.30

### Patch Changes

- [`47515cd`](https://github.com/preconstruct/preconstruct/commit/47515cd533d341c1138f108abc660061eb3486a3) Thanks [@emmatown](https://github.com/emmatown)! - Validate that the root dist directory of a package is included in the published files since common chunks may be written to it

* [`cfda1c6`](https://github.com/preconstruct/preconstruct/commit/cfda1c69e32aec01607e1f103bf4a9878cc5bd5b) Thanks [@emmatown](https://github.com/emmatown)! - Fix the error message shown when an entrypoint in a package has a given build type and another doesn't

- [`cfe7d95`](https://github.com/preconstruct/preconstruct/commit/cfe7d9537c0b08f9f127929d62fa97b24d4c31ae) Thanks [@emmatown](https://github.com/emmatown)! - Add no-op file to `@preconstruct/hook` that will be imported by bundlers instead of the real require hook so that the `preconstruct dev` output will work in bundlers without a module build or bundler config changes(including for React Native's bundler, Metro)

* [`9a64c4e`](https://github.com/preconstruct/preconstruct/commit/9a64c4e3b90887d69dbfaf408f4dd29497a241aa) Thanks [@emmatown](https://github.com/emmatown)! - Cache Acorn parse step so that modules are only parsed a single time with Acorn rather than a number of times equal to the number of build types for a given package

- [`47515cd`](https://github.com/preconstruct/preconstruct/commit/47515cd533d341c1138f108abc660061eb3486a3) Thanks [@emmatown](https://github.com/emmatown)! - Improve error messages for invalid fields

- Updated dependencies [[`cfe7d95`](https://github.com/preconstruct/preconstruct/commit/cfe7d9537c0b08f9f127929d62fa97b24d4c31ae)]:
  - @preconstruct/hook@0.4.0

## 1.1.29

### Patch Changes

- [`77b6d2f`](https://github.com/preconstruct/preconstruct/commit/77b6d2f3c2d82827c1270e03a48585967f4be8db) Thanks [@emmatown](https://github.com/emmatown)! - Fix dist directory not being published in previous release

## 1.1.28

### Patch Changes

- [`86d8d3d`](https://github.com/preconstruct/preconstruct/commit/86d8d3d76ba6fc7966dc392de904040f72bd9f3d) [#322](https://github.com/preconstruct/preconstruct/pull/322) Thanks [@emmatown](https://github.com/emmatown)! - Deduplicate Babel helpers when not using @babel/plugin-transform-runtime(note that we still recommend using @babel/plugin-transform-runtime, this is just stopping the duplication if you choose not to use it)

* [`3b3cacb`](https://github.com/preconstruct/preconstruct/commit/3b3cacbb33ddef7cf782c5b596c7b5d866ac8ede) Thanks [@emmatown](https://github.com/emmatown)! - Disable usage of worker processes when running on CI to improve performance(Emotion's preconstruct build on CircleCI went from ~2 minutes to ~10 seconds when disabling the worker)

- [`2d62357`](https://github.com/preconstruct/preconstruct/commit/2d6235707318cc9faae8d544058068d34d0bddab) [#320](https://github.com/preconstruct/preconstruct/pull/320) Thanks [@emmatown](https://github.com/emmatown)! - Fix process.env.NODE_ENV reassignment throwing a syntax error

## 1.1.27

### Patch Changes

- [`f4e9954`](https://github.com/preconstruct/preconstruct/commit/f4e9954fec700dd8467100d555df573be3be6e19) Thanks [@emmatown](https://github.com/emmatown)! - Stop memoizing creation of TS programs for declaration generation when the tsconfig is in the package directory to allow garbage collection and prevent out of memory errors (Note that having a tsconfig per package will still be slower than having one at the root of the project since TS will be doing unnecessary repeated work)

* [`8aaec07`](https://github.com/preconstruct/preconstruct/commit/8aaec072ce6c89acddac0e79109a81fd34f6ebfa) Thanks [@emmatown](https://github.com/emmatown)! - Correctly cache entrypoint source file resolution

## 1.1.26

### Patch Changes

- [`99090cb`](https://github.com/preconstruct/preconstruct/commit/99090cbf61fa080ed53857d7d1247bbf275a6b1b) [#312](https://github.com/preconstruct/preconstruct/pull/312) Thanks [@emmatown](https://github.com/emmatown)! - Upgrade dependencies

## 1.1.25

### Patch Changes

- [`6b3f95e`](https://github.com/preconstruct/preconstruct/commit/6b3f95e2db4704722dc5d3c9ade64fb2d3a76965) Thanks [@emmatown](https://github.com/emmatown)! - Fix bug in reading of TS config resulting in wrong type definitions being generated in some cases. This should remove the need for the experimental `useTSMorphToGenerateTSDeclarations` and `useSourceInsteadOfGeneratingTSDeclarations` flags.

## 1.1.24

### Patch Changes

- [`6727d9b`](https://github.com/preconstruct/preconstruct/commit/6727d9b0eb504a64072ddb710af570ecb7ac28c6) Thanks [@emmatown](https://github.com/emmatown)! - Add `logCompiledFiles` experimental flag for logging when files are compiled with Babel

## 1.1.23

### Patch Changes

- [`d56018d`](https://github.com/preconstruct/preconstruct/commit/d56018d6793d7298912bf2e4dc9fd92c981e7e9f) Thanks [@emmatown](https://github.com/emmatown)! - Skip double removing of package dist directory to attempt to fix EINVAL errors on build

## 1.1.22

### Patch Changes

- [`5ad1c73`](https://github.com/preconstruct/preconstruct/commit/5ad1c73c3615ac1742b7beb8abb15680be5ad0e4) Thanks [@emmatown](https://github.com/emmatown)! - Correctly only compile files within the package directory in the require hook for `preconstruct dev`

- Updated dependencies [[`5ad1c73`](https://github.com/preconstruct/preconstruct/commit/5ad1c73c3615ac1742b7beb8abb15680be5ad0e4)]:
  - @preconstruct/hook@0.3.0

## 1.1.21

### Patch Changes

- [`286d8fb`](https://github.com/preconstruct/preconstruct/commit/286d8fbfbe251b6c8c4f876a3dddb6ce0ecdaed9) Thanks [@emmatown](https://github.com/emmatown)! - Make check for default exports more reliable for preconstruct dev's `.d.ts` redirect file generation

* [`b8d1906`](https://github.com/preconstruct/preconstruct/commit/b8d19066e6fa520f153497ee403d6dcd76c8edec) Thanks [@emmatown](https://github.com/emmatown)! - Only compile files within the package directory in the require hook for `preconstruct dev`

* Updated dependencies [[`b8d1906`](https://github.com/preconstruct/preconstruct/commit/b8d19066e6fa520f153497ee403d6dcd76c8edec)]:
  - @preconstruct/hook@0.2.0

## 1.1.20

### Patch Changes

- [`a723556`](https://github.com/preconstruct/preconstruct/commit/a7235569dd4055125bb7a099c1bf4d7dba8dc1ba) Thanks [@emmatown](https://github.com/emmatown)! - Fix prompt for creating entrypoint package.jsons showing every entrypoint as the package name when using `newEntrypoints` experimental flag

## 1.1.19

### Patch Changes

- [`cae339b`](https://github.com/preconstruct/preconstruct/commit/cae339b721ee0cd857e84f6454208e265be3cdc0) Thanks [@emmatown](https://github.com/emmatown)! - Fix `newEntrypoints` experimental flag on Windows

## 1.1.18

### Patch Changes

- [`68fdeeb`](https://github.com/preconstruct/preconstruct/commit/68fdeebd8160a6aca9aedea027fb5f06e2e86323) Thanks [@emmatown](https://github.com/emmatown)! - Cache source module resolution

* [`e3a5c0c`](https://github.com/preconstruct/preconstruct/commit/e3a5c0c86011b439fef65a750b0e0acbc07c65de) Thanks [@emmatown](https://github.com/emmatown)! - Skip parsing modules with Babel to determine if they have default exports or not if we're sure they don't based on a regex when running `preconstruct dev`

## 1.1.17

### Patch Changes

- [`933d831`](https://github.com/preconstruct/preconstruct/commit/933d83165ff021a704904759b6e7004159c3322a) Thanks [@emmatown](https://github.com/emmatown)! - Fix the ts-morph declaration generator generating files outside of the package's directory

## 1.1.16

### Patch Changes

- [`3c5743a`](https://github.com/preconstruct/preconstruct/commit/3c5743a86005e261671452c9bdf4b985d3a90ee3) Thanks [@emmatown](https://github.com/emmatown)! - Add experimental `useTSMorphToGenerateTSDeclarations` flag

## 1.1.15

### Patch Changes

- [`eeb0077`](https://github.com/preconstruct/preconstruct/commit/eeb007701cae285e36003f5d1c673504e045c5ef) Thanks [@emmatown](https://github.com/emmatown)! - Use relative paths in `preconstruct dev` files

## 1.1.14

### Patch Changes

- [`0b1c19c`](https://github.com/preconstruct/preconstruct/commit/0b1c19c6af34fc639cb2a4fd6001b3d88b4506cf) Thanks [@emmatown](https://github.com/emmatown)! - Add experimental `useSourceInsteadOfGeneratingTSDeclarations` flag. This flag should not be used and is intended to be a workaround for some TypeScript declaration bugs.

## 1.1.13

### Patch Changes

- [`8e5c29d`](https://github.com/preconstruct/preconstruct/commit/8e5c29ddf0db57c3299c6c463754b8a4c6fddad7) [#281](https://github.com/preconstruct/preconstruct/pull/281) Thanks [@emmatown](https://github.com/emmatown)! - Exclude package directories without package.jsons rather than prompting to delete them, this aligns with the behaviour of package managers.

## 1.1.12

### Patch Changes

- [`5562440`](https://github.com/preconstruct/preconstruct/commit/55624404d6e47f328a7e652b05f90ac5962c55ef) [#278](https://github.com/preconstruct/preconstruct/pull/278) Thanks [@evocateur](https://github.com/evocateur)! - Force emit when generating declaration files

## 1.1.11

### Patch Changes

- [`1833512`](https://github.com/preconstruct/preconstruct/commit/1833512c454bc7312a0ee2b79016248be13d5665) Thanks [@emmatown](https://github.com/emmatown)! - Remove a console.log

## 1.1.10

### Patch Changes

- [`6698d62`](https://github.com/preconstruct/preconstruct/commit/6698d62a9dbda34aeff705e8bcbd9c69ec107bcc) [#275](https://github.com/preconstruct/preconstruct/pull/275) Thanks [@emmatown](https://github.com/emmatown)! - Add experimental new entrypoints feature flag (note that this should not be used and will break in patch versions)

## 1.1.9

### Patch Changes

- [`e2a8e9f`](https://github.com/preconstruct/preconstruct/commit/e2a8e9fdabf25e87fdaf398aa9863a47a3e68712) [#272](https://github.com/preconstruct/preconstruct/pull/272) Thanks [@emmatown](https://github.com/emmatown)! - Fix TypeScript declaration generation with internal repo type dependencies

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

- [`5acf0ea`](https://github.com/preconstruct/preconstruct/commit/5acf0eac374ac8c462ac60b7bd16fdbdbe528fe8) [#252](https://github.com/preconstruct/preconstruct/pull/252) Thanks [@emmatown](https://github.com/emmatown)! - Upgrade Rollup and related packages

* [`a238788`](https://github.com/preconstruct/preconstruct/commit/a2387881924425d614c256a521527417d641e011) Thanks [@emmatown](https://github.com/emmatown)! - Fix source option not being written

## 1.1.4

### Patch Changes

- [`e50769a`](https://github.com/preconstruct/preconstruct/commit/e50769a843f827292bdf94dd52cb26be31f0fc1c) [#239](https://github.com/preconstruct/preconstruct/pull/239) Thanks [@mrmartineau](https://github.com/mrmartineau) - Improve error message when attempting to create a TypeScript declaration file for a non-TypeScript file

- [`fd875bb`](https://github.com/preconstruct/preconstruct/commit/fd875bbf6bf5fddc79c195a90c3804d6c2bfde57) Thanks [@emmatown](https://github.com/emmatown)! - Update npm-packlist to fix bug where npm-normalize-package-bin wasn't specified in the dependencies of npm-packlist

## 1.1.3

### Patch Changes

- [`3098cfc`](https://github.com/preconstruct/preconstruct/commit/3098cfc5a26cccc7b051c417cee164b216ff6f84) Thanks [@emmatown](https://github.com/emmatown)! - Improve error when a package.json is invalid JSON

## 1.1.2

### Patch Changes

- [`1e37a5d`](https://github.com/preconstruct/preconstruct/commit/1e37a5de036ca4f897c990457676c33a6ae287bc) [#228](https://github.com/preconstruct/preconstruct/pull/228) Thanks [@emmatown](https://github.com/emmatown)! - Batch build errors together

## 1.1.1

### Patch Changes

- [`c1cfc05`](https://github.com/preconstruct/preconstruct/commit/c1cfc0503f73a197487d6cba6ada607fe957f527) [#226](https://github.com/preconstruct/preconstruct/pull/226) Thanks [@emmatown](https://github.com/emmatown)! - Fixed global prompt never showing up and get each global lazily so that peerDependencies which are never imported are not required to have a global

## 1.1.0

### Minor Changes

- [`b2e1118`](https://github.com/preconstruct/preconstruct/commit/b2e1118b47037d6d2fb03eef39aeaeceec2d20e5) [#224](https://github.com/preconstruct/preconstruct/pull/224) Thanks [@Andarist](https://github.com/Andarist)! - Rewrite references to @babel/runtime helpers when they are externalized in ESM builds.

## 1.0.2

### Patch Changes

- [`37ff280`](https://github.com/preconstruct/preconstruct/commit/37ff2804057d4c214f47a0ab8d0bd1c7403f3525) Thanks [@emmatown](https://github.com/emmatown)! - Add README to package

## 1.0.1

### Patch Changes

- [`887349e`](https://github.com/preconstruct/preconstruct/commit/887349ef4d1d8d1c9e91c032ecd1c6cc1c220772) Thanks [@emmatown](https://github.com/emmatown)! - Replace `rollup-plugin-alias` with `@rollup/plugin-alias` and `rollup-plugin-replace` with `@rollup/plugin-replace`

## 1.0.0

### Major Changes

- [`c4886ea`](https://github.com/preconstruct/preconstruct/commit/c4886ea432a839291437c3346ddc6253b462c918) [#218](https://github.com/preconstruct/preconstruct/pull/218) Thanks [@emmatown](https://github.com/emmatown)! - Rename package to @preconstruct/cli

### Minor Changes

- [`0ac7b7f`](https://github.com/preconstruct/preconstruct/commit/0ac7b7fd34cf3589c62e1cf94a9b9488e8e3bf85) Thanks [@emmatown](https://github.com/emmatown)! - Stop prompting to create browser build because people often don't want it/it isn't useful for most cases. Note that support for the field hasn't been removed, you can still add the field manually

### Patch Changes

- [`c4886ea`](https://github.com/preconstruct/preconstruct/commit/c4886ea432a839291437c3346ddc6253b462c918) [#218](https://github.com/preconstruct/preconstruct/pull/218) Thanks [@emmatown](https://github.com/emmatown)! - Fix TypeScript declaration generation in TypeScript 3.7

* [`7dd4014`](https://github.com/preconstruct/preconstruct/commit/7dd4014bded6f747db8b0e0a5eb9fa04f5f9d67e) Thanks [@emmatown](https://github.com/emmatown)! - Improve error messages

- [`8e5635d`](https://github.com/preconstruct/preconstruct/commit/8e5635db58e231cefdd686fe315f0af32c47b1ca) Thanks [@emmatown](https://github.com/emmatown)! - Mention errors page when an error occurs

## 0.3.2

### Patch Changes

- [`21bbc08`](https://github.com/preconstruct/preconstruct/commit/21bbc084418589e931773e529e913df120c2fb16) [#205](https://github.com/preconstruct/preconstruct/pull/205) Thanks [@Vultraz](https://github.com/Vultraz)! - Fixed dist file check failing on Windows due to path separator mismatch

## 0.3.1

### Patch Changes

- [`078886b`](https://github.com/preconstruct/preconstruct/commit/078886b9de4c060a89a100751ef0bf42cbf3e95b) [#171](https://github.com/preconstruct/preconstruct/pull/171) Thanks [@emmatown](https://github.com/emmatown)! - Prompt for entrypoint source when not the entrypoint is not at the root of the package

## 0.3.0

### Minor Changes

- [`f02cce5`](https://github.com/preconstruct/preconstruct/commit/f02cce5b05650485da522f29dd7758b290505986) [#163](https://github.com/preconstruct/preconstruct/pull/163) Thanks [@emmatown](https://github.com/emmatown)! - Remove automatic inclusion of `@babel/plugin-transform-runtime`.

  Preconstruct no longer automatically includes `@babel/plugin-transform-runtime` to reduce confusion where code works when built with Preconstruct but fails if built using another tool which directly uses a project's Babel config. You should **include `@babel/plugin-transform-runtime`** in your Babel config unless it is already included.

  ```js
  {
    "plugins": ["@babel/plugin-transform-runtime"]
  }
  ```

### Patch Changes

- [`a24784a`](https://github.com/preconstruct/preconstruct/commit/a24784a302028b95bb5686921cf948cac096d530) Thanks [@emmatown](https://github.com/emmatown)! - Update dependencies

* [`11e0f62`](https://github.com/preconstruct/preconstruct/commit/11e0f621983da71215953a06f0aa66c482048568) [#170](https://github.com/preconstruct/preconstruct/pull/170) Thanks [@emmatown](https://github.com/emmatown)! - Use detected indentation when writing package.json files

* Updated dependencies [[`f02cce5`](https://github.com/preconstruct/preconstruct/commit/f02cce5b05650485da522f29dd7758b290505986)]:
  - @preconstruct/hook@0.1.0

## 0.2.0

### Minor Changes

- [72989b6](https://github.com/preconstruct/preconstruct/commit/72989b6693ea245a50c2be92813ad794e0eb5e02) [#106](https://github.com/preconstruct/preconstruct/pull/106) Thanks [@emmatown](https://github.com/emmatown)! - Prompt to create an entrypoint if a glob is a path and the directory doesn't exist

## 0.1.3

### Patch Changes

- [aefeb4f](https://github.com/preconstruct/preconstruct/commit/aefeb4f55c11a847217a5f868e132bd20a373711) Thanks [@emmatown](https://github.com/emmatown)! - Use TypeScript internally

- Updated dependencies [aefeb4f]:
  - @preconstruct/hook@undefined

## 0.1.2

### Patch Changes

- [13b79ea](https://github.com/preconstruct/preconstruct/commit/13b79ea642e74441cf4311beb8cec295a26ae1fd) Thanks [@emmatown](https://github.com/emmatown)! - Add v8-compile-cache
- [681537c](https://github.com/preconstruct/preconstruct/commit/681537cbb6cf7dc8e4011b5ee8a3f7f8e31ea831) Thanks [@emmatown](https://github.com/emmatown)! - Remove unused dependencies
- [6dcfc40](https://github.com/preconstruct/preconstruct/commit/6dcfc40b746004e5e6b28064f9f2939f8399a7ed) Thanks [@emmatown](https://github.com/emmatown)! - Improve error message for Babel parse errors

## 0.1.1

### Patch Changes

- [f14c39e](https://github.com/preconstruct/preconstruct/commit/f14c39ebb0fb69e0a645dce6f1575b135e6e42e2) Thanks [@emmatown](https://github.com/emmatown)! - Add a comment to the commonjs file for preconstruct dev explaining what it does
- [7c278d2](https://github.com/preconstruct/preconstruct/commit/7c278d2f7815d99b1e89c83968052b56908d6b46) Thanks [@emmatown](https://github.com/emmatown)! - Change redirect for flow in preconstruct dev to a file with export \* because symlinks seem to be breaking

## 0.1.0

### Minor Changes

- [2f50306](https://github.com/preconstruct/preconstruct/commit/2f50306) [#88](https://github.com/preconstruct/preconstruct/pulls/88) Thanks [@emmatown](https://github.com/emmatown)! - Remove react-native field support(note: this doesn't mean you can't build libraries for react native with preconstruct, it just means preconstruct won't make a special build for react native)

## 0.0.90

### Patch Changes

- [f1371f4](https://github.com/preconstruct/preconstruct/commit/f1371f4) [#84](https://github.com/preconstruct/preconstruct/pulls/84) Thanks [@emmatown](https://github.com/emmatown)! - Check that all entrypoints and dist files will be included when published to npm

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

- [cec3b9f](https://github.com/preconstruct/preconstruct/commit/cec3b9f) [#75](https://github.com/preconstruct/preconstruct/pulls/75) Thanks [@emmatown](https://github.com/emmatown)! - Fix TypeScript declaration file generation where a file only exports types

## 0.0.84

### Patch Changes

- [a71a4f4](https://github.com/preconstruct/preconstruct/commit/a71a4f4) - Move an internal file

## 0.0.83

### Patch Changes

- [ee8278f](https://github.com/preconstruct/preconstruct/commit/ee8278f) [#71](https://github.com/preconstruct/preconstruct/pulls/71) Thanks [@emmatown](https://github.com/emmatown)! - Allow importing JSON (only as a default export)
- [e6f0b03](https://github.com/preconstruct/preconstruct/commit/e6f0b03) [#70](https://github.com/preconstruct/preconstruct/pulls/70) Thanks [@emmatown](https://github.com/emmatown)! - Prompt to delete package directories that do not contain package.jsons

## 0.0.82

### Patch Changes

- [1e851be](https://github.com/preconstruct/preconstruct/commit/1e851be) [#69](https://github.com/preconstruct/preconstruct/pulls/69) Thanks [@emmatown](https://github.com/emmatown)! - Switch symlinks in `preconstruct dev` to CommonJS re-exports to avoid issues when using Node's `--preserve-symlinks` option.

## 0.0.81

### Patch Changes

- [99f1549](https://github.com/preconstruct/preconstruct/commit/99f1549) - Remove dependency on some emotion packages that caused preconstruct to break when building emotion

## 0.0.80

### Patch Changes

- [ccc162f](https://github.com/preconstruct/preconstruct/commit/ccc162f) [#64](https://github.com/preconstruct/preconstruct/pulls/64) Thanks [@emmatown](https://github.com/emmatown)! - Refactor logging and include package name in uncaught build errors
- [9cab2d1](https://github.com/preconstruct/preconstruct/commit/9cab2d1) [#65](https://github.com/preconstruct/preconstruct/pulls/65) Thanks [@emmatown](https://github.com/emmatown)! - Replace internal Babel runtime helpers CJS transform from an AST transform to regex
- [df58a43](https://github.com/preconstruct/preconstruct/commit/df58a43) [#68](https://github.com/preconstruct/preconstruct/pulls/68) Thanks [@emmatown](https://github.com/emmatown)! - Add validation to disallow transitive peerDependencies where the peerDep is not specified in the direct parent
- [ff49a6d](https://github.com/preconstruct/preconstruct/commit/ff49a6d) [#66](https://github.com/preconstruct/preconstruct/pulls/66) Thanks [@emmatown](https://github.com/emmatown)! - Create rollup externals from dependencies and peerDependencies without checking nested deps. If you get an error saying that a dependency is missing when it previously worked, you should add that package as a dependency or peerDependency.

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

- [2e01590](https://github.com/preconstruct/preconstruct/commit/2e01590) [#60](https://github.com/preconstruct/preconstruct/pulls/60) Thanks [@emmatown](https://github.com/emmatown)! - Stop adding a postinstall script with preconstruct dev in preconstruct init. This was causing problems with single package repos so it's being removing for now.

## 0.0.72

### Patch Changes

- [cd0979f](https://github.com/preconstruct/preconstruct/commit/cd0979f) - Change TS declaration filename

## 0.0.71

### Patch Changes

- [ac2eb8a](https://github.com/preconstruct/preconstruct/commit/ac2eb8a) [#59](https://github.com/preconstruct/preconstruct/pulls/59) Thanks [@emmatown](https://github.com/emmatown)! - Add typescript declaration generation

## 0.0.70

### Patch Changes

- [423a8b6](https://github.com/preconstruct/preconstruct/commit/423a8b6) [#56](https://github.com/preconstruct/preconstruct/pulls/56) Thanks [@emmatown](https://github.com/emmatown)! - Add checks that imported modules in a package are inside of the package's directory
- [8b6e051](https://github.com/preconstruct/preconstruct/commit/8b6e051) [#58](https://github.com/preconstruct/preconstruct/pulls/58) Thanks [@emmatown](https://github.com/emmatown)! - Fix entrypoints package.json creation
- [4a9de88](https://github.com/preconstruct/preconstruct/commit/4a9de88) [#57](https://github.com/preconstruct/preconstruct/pulls/57) Thanks [@emmatown](https://github.com/emmatown)! - Add .d.ts file so that TS types can be found when built

## 0.0.69

### Patch Changes

- [802fec0](https://github.com/preconstruct/preconstruct/commit/802fec0) [#54](https://github.com/preconstruct/preconstruct/pulls/54) Thanks [@emmatown](https://github.com/emmatown)! - Replace flow file that re-exports source contents with a symlink in dev command. This fixes the problem where if you added or removed the default export of an entrypoint source file, you would have to run `preconstruct dev` again.
- [b351218](https://github.com/preconstruct/preconstruct/commit/b351218) [#55](https://github.com/preconstruct/preconstruct/pulls/55) Thanks [@emmatown](https://github.com/emmatown)! - Add support for TypeScript resolving types with dev command

## 0.0.68

### Patch Changes

- [9022265](https://github.com/preconstruct/preconstruct/commit/9022265) - Set fields in a better order

## 0.0.67

### Patch Changes

- [b22d4e1](https://github.com/preconstruct/preconstruct/commit/b22d4e1) - Fix init command prompting incorrectly for UMD builds
- [0a9b9d7](https://github.com/preconstruct/preconstruct/commit/0a9b9d7) - Remove aliases export, this is now replaced with the dev command

## 0.0.66

### Patch Changes

- [698fe38](https://github.com/preconstruct/preconstruct/commit/698fe38) [#53](https://github.com/preconstruct/preconstruct/pulls/53) Thanks [@emmatown](https://github.com/emmatown)! - Move require hook into a package
