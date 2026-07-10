# Investigating a switch from Rollup to Rolldown

_Research date: 2026-07-10. Sources are limited to this repository and first-party Rolldown, Vite, tsdown, and Rollup project material._

## Recommendation

The isolated runtime spike succeeded, so switching is **technically viable**, but the evidence does not yet justify making Rolldown the production default. The intended architecture should use `preconstruct.transform: "oxc" | "babel"`, defaulting to `"oxc"`. The next gates are a consumer-scale benchmark, a product decision on the Node runtime floor, and defining the compatibility contract for that new default transform.

First decide whether `@preconstruct/cli` may require Node `^20.19.0 || >=22.12.0`; Rolldown's engine constraint becomes a runtime requirement for every Preconstruct user, not merely a CI/build-host detail. If that floor is acceptable and the existing build suite and package-consumer checks pass after the small compatibility adaptations below, introduce Rolldown behind an opt-in experimental flag and run both bundlers in CI for a trial period. Promote it only after output/API equivalence is demonstrated across the supported package matrix and measured wall-clock improvement justifies carrying a native dependency.

This is worth investigating now: Rolldown reached stable `1.0.0` on 2026-05-07; as of the research date, npm's `latest` tag is `1.1.5` (published 2026-07-08). Its package requires Node `^20.19.0 || >=22.12.0`, so the local Node `20.20.2` runtime satisfies it. Its direct JavaScript and watcher APIs intentionally mirror Rollup's. It is not a drop-in dependency substitution for this repository, however. Preconstruct is itself a library build tool with a custom Rollup plugin stack and observable output conventions; those are exactly the areas where compatibility needs proof rather than assumption. [Rolldown 1.0 release](https://github.com/rolldown/rolldown/releases/tag/v1.0.0), [`rolldown@1.1.5` package](https://www.npmjs.com/package/rolldown/v/1.1.5), [getting started and release channels](https://rolldown.rs/guide/getting-started), [bundler API](https://rolldown.rs/apis/bundler-api)

## Empirical spike result

An isolated `/tmp` install was used to substitute Rolldown at runtime without editing application code: requests for `rollup` received Rolldown's exports with `rolldown()` exposed under the old local `rollup` name. This exercised the existing build API calls and existing official/custom plugin objects unchanged.

- With current `rolldown@1.1.5`, the complete targeted matrix passed: **9 suites, 128 tests, and 261 existing meaningful snapshots**. The network-dependent fixture suite was run separately because the sandboxed Yarn install writes a transient `yarn-error.log`; that generated snapshot was excluded and reverted.
- This includes the custom Babel AST path, declarations, UMD/browser/CJS/ESM outputs, multiple entrypoints, import conditions, React Server Component directives, warning behavior, and the experimental dynamic-import flag.
- A full `rolldown@1.1.3` comparison took 61.6 seconds versus 60.5 seconds for Rollup 2.79.1 on the same Node 20.20.2 environment. That is effectively no improvement and slightly slower within run-to-run noise. The result is unsurprising because these fixtures spend substantial time in Babel workers, TypeScript declaration generation, Terser, filesystem setup, and two failed network installs.
- The spike proves strong runtime compatibility, not type-level compatibility, watch/rebuild behavior, native-package portability, or performance on a large module graph. A real port still needs Rolldown type imports and direct imports rather than the test shim.

The practical conclusion is stronger than a docs-only assessment: most feared plugin/output incompatibilities do **not** reproduce in the current suite. The remaining blockers are the Node floor, a real-world performance case, types/lifecycle cleanup, watch coverage, and distribution testing.

## Target transform architecture: Babel is opt-in

Today Babel is unconditional in both halves of the product:

- `preconstruct build` always installs the custom Babel Rollup plugin, even when the user has no Babel config.
- `preconstruct dev` generates a CommonJS proxy that always registers `@preconstruct/hook`, whose synchronous require hook always calls `babel.transformSync()`.

The migration should make the compiler choice explicit:

```json
{
  "preconstruct": {
    "transform": "oxc"
  }
}
```

The configuration contract is `preconstruct.transform: "oxc" | "babel"`, with `"oxc"` used when the field is omitted. In Oxc mode, Rolldown/Oxc should strip TypeScript, transform JSX according to the nearest `tsconfig.json`, and perform any configured ES2015+ syntax lowering. In Babel mode, Preconstruct should preserve its current Babel configuration resolution, helper generation, runtime-helper rewriting, and development-hook behavior:

```json
{
  "preconstruct": {
    "transform": "babel"
  }
}
```

A Babel config file alone should not silently select Babel; requiring `transform: "babel"` makes builds predictable and allows Babel packages to become optional installation cost. Rolldown officially provides built-in TypeScript, JSX, and ES2015+ lowering, with `tsconfig: true` auto-discovery. [Rolldown built-in transforms](https://rolldown.rs/guide/notable-features#built-in-transforms), [tsconfig discovery](https://rolldown.rs/reference/InputOptions.tsconfig)

This is an intentional breaking change, not an internal optimization:

- Oxc cannot target ES5; its lowest lowering target is ES2015. Consumers needing ES5 or arbitrary Babel plugins/presets must opt into Babel. [Rolldown transform target](https://rolldown.rs/reference/Interface.TransformOptions-1)
- Rolldown's documented input languages are JavaScript/JSX and TypeScript/TSX, not Flow. Existing Flow packages must opt into Babel.
- Oxc's default JSX runtime is automatic, while existing Babel behavior is whatever the user's Babel config specifies. Preconstruct should define and test its own default—preferably derive it from `tsconfig.json` rather than inherit an accidental tool default. [Oxc JSX options](https://oxc.rs/docs/guide/usage/transformer/jsx.html)
- TypeScript transformation remains isolated-module style, with known namespace caveats. Declaration generation can remain on the existing TypeScript-based plugin initially. [Oxc TypeScript caveats](https://oxc.rs/docs/guide/usage/transformer/typescript)

Making Babel genuinely optional requires more than conditionally omitting one plugin:

1. Add and validate `preconstruct.transform` as the string union `"oxc" | "babel"`, defaulting to `"oxc"` in the next major release. Any other value should produce a scoped configuration error.
2. Do not construct or import the Babel plugin, Babel helper machinery, or runtime-helper rewrite unless `transform === "babel"`. The current Babel plugin resolves `@babel/core`, `@babel/helpers`, and `@babel/generator` at module initialization.
3. Split or lazily load the Babel-specific worker code. The current worker statically imports `@babel/helper-module-imports` even though the same worker also hosts Terser.
4. Make `@babel/core`, Babel presets/plugins, and the Babel development hook opt-in dependencies supplied by the consuming project. Keep unrelated uses such as `@babel/code-frame` separate from the compiler decision.
5. Replace the default development require hook with a synchronous Oxc transform (`oxc-transform` exposes `transformSync`), retaining the Babel hook only for `transform: "babel"`. This keeps `preconstruct dev` aligned with `preconstruct build`. [Oxc transformer API](https://oxc.rs/docs/guide/usage/transformer.html)
6. Partition the test matrix into default-Oxc fixtures and explicit-Babel fixtures. Flow, macros, custom plugins, ES5 output, and Babel runtime-helper behavior belong in the latter; plain JS, TypeScript, TSX/JSX, declarations, conditions, and server directives should prove the default path.

This architecture should improve the performance case more than the runtime substitution spike did: it removes Babel worker transforms and the Babel AST/helper path from ordinary builds, which are substantial non-Rolldown costs in the current benchmark. It must be benchmarked separately from the bundler-only comparison because it intentionally changes the compiler and output contract.

## What this repository does today

- `@preconstruct/cli` depends on Rollup `^2.79.1` and five official Rollup plugins: alias `^3.1.1`, CommonJS `^15.0.0`, JSON `^4.1.0`, node-resolve `^11.2.1`, and replace `^2.4.1`. See [`packages/cli/package.json`](../packages/cli/package.json).
- The build constructs separate UMD, browser, worker, Node development, Node production, and custom-condition configurations, then generates CJS and/or ESM outputs with stable filename patterns. See [`packages/cli/src/build/config.ts`](../packages/cli/src/build/config.ts).
- It calls `rollup(config)` directly, calls `bundle.generate()` one or more times, and writes generated assets itself. Watch mode calls Rollup's `watch()` API and consumes `START`, `BUNDLE_START`, `BUNDLE_END`, `END`, and `ERROR` events. See [`packages/cli/src/build/index.ts`](../packages/cli/src/build/index.ts) and [`packages/cli/src/build/watch.ts`](../packages/cli/src/build/watch.ts).
- The config includes 11 custom plugin implementations/hooks. They cover Babel and runtime helpers, declaration and Flow files, development/production proxies, `.mjs` proxies, React Server Component directives, warning handling, environment replacement, minification, and dynamic-import/chunk rewriting. See [`packages/cli/src/build/rollup.ts`](../packages/cli/src/build/rollup.ts) and [`packages/cli/src/rollup-plugins`](../packages/cli/src/rollup-plugins).
- Babel is currently part of Preconstruct's default public behavior: user Babel configuration is resolved normally, and users can select arbitrary presets/plugins. The proposed design retains that capability behind explicit `preconstruct.transform: "babel"`. The repository itself targets Node 8 and uses `babel-plugin-macros`, so its own packages will need to select Babel until they no longer require those transforms. See [`site/docs/guides/configuring-babel.md`](../site/docs/guides/configuring-babel.md), [`babel.config.js`](../babel.config.js), and [Rolldown transforms](https://rolldown.rs/guide/notable-features#built-in-transforms).
- CI currently selects `lts/*` rather than declaring a fixed build-time Node matrix, while the site alone declares Node `>=16.14`. A native-binary dependency therefore needs an explicit supported host matrix before release. See [`.github/actions/setup-deps/action.yml`](../.github/actions/setup-deps/action.yml) and [`site/package.json`](../site/package.json).
- Rolldown 1.1.5 is ESM-only at its JavaScript entry point (`type: "module"`, `./dist/index.mjs`) and declares Node `^20.19.0 || >=22.12.0`. Because the published Preconstruct CLI loads the bundler at runtime, switching backends raises the CLI's effective Node floor even if Preconstruct continues compiling its own code for Node 8. The local Node 20.20.2 spike environment is valid, but compatibility with Node 16/18 or Node 20 before 20.19 is not available. [`rolldown@1.1.5` package](https://www.npmjs.com/package/rolldown/v/1.1.5)

## Migration routes available now

### 1. Direct Rolldown API: recommended migration route

Install `rolldown` 1.x, replace imports from `rollup` with the corresponding Rolldown API/types, call `rolldown(config)` in place of `rollup(config)`, and use `watch()` from Rolldown. The input/output separation and watcher event model are deliberately Rollup-compatible. Unlike the current code, every returned bundle should be closed in a `finally` block; Rolldown documents `close()` as required even if generation fails. Watch results likewise expose a closeable result. [getting started](https://rolldown.rs/guide/getting-started#using-the-api), [bundler API](https://rolldown.rs/apis/bundler-api), [`RolldownBuild.close()`](https://rolldown.rs/reference/interface.rolldownbuild), [watch events](https://rolldown.rs/reference/TypeAlias.RolldownWatcherEvent)

A concrete low-churn spike can import `rolldown` under the old local name—`import { rolldown as rollup } from "rolldown"`—in `build/index.ts`, and change the watcher import to `import { watch } from "rolldown"`; then migrate the type-only imports across config/plugins. A package-manager alias alone is not sufficient because Rolldown exports the compatible function as `rolldown`, not `rollup`. Keeping the local function name isolates the first experiment from a broad rename while still exercising the real API.

This route preserves Preconstruct's architecture and gives the cleanest Rollup-versus-Rolldown comparison. Rolldown's newer `build()` convenience API is explicitly experimental and may change in patch releases, so it is the wrong API for a compatibility-sensitive first migration. [bundler API](https://rolldown.rs/apis/bundler-api#build)

### 2. tsdown: useful reference, not the right first migration

Rolldown's own guide points library authors to tsdown. tsdown provides library-oriented defaults, declaration generation, multiple formats, workspace mode, and a Rolldown plugin surface. However, Preconstruct is not merely a library being bundled: it is the build system that calculates per-package outputs, rewrites package entry behavior, and implements its own declaration/proxy conventions. Moving the implementation to tsdown would replace substantial product logic and make it harder to isolate bundler compatibility. Reconsider it only as a later product redesign. [Rolldown recommendation](https://rolldown.rs/guide/getting-started), [tsdown's scope](https://tsdown.dev/guide/), [tsdown plugin compatibility](https://tsdown.dev/advanced/plugins)

### 3. Vite / `rolldown-vite`: not applicable

Vite 8 now ships Rolldown, and the temporary `rolldown-vite` package remains a gradual route for Vite 7 applications. This repository does not use Vite for its package builder, so neither route replaces its direct Rollup API. Vite's migration guide is still useful as an official inventory of behavioral differences, especially unsupported hooks. [Vite 8 announcement](https://vite.dev/blog/announcing-vite8), [Vite 8 migration guide](https://vite.dev/guide/migration.html#rolldown)

## Follow-up work for a production-quality direct port

The runtime shim passed without these changes. They remain appropriate for aligning with Rolldown's documented API, satisfying its types, and avoiding reliance on compatibility behavior that may not be contractual.

### Known code changes

1. **Replace the custom `renderDynamicImport` hook.** The existing test passes under Rolldown because `output.dynamicImportInCjs` defaults to `true`, but Rolldown does not document support for the Rollup hook. Preserve the experimental flag's public semantics explicitly with `output.dynamicImportInCjs`. See [`packages/cli/src/build/rollup.ts`](../packages/cli/src/build/rollup.ts), [unsupported plugin hooks](https://rolldown.rs/apis/plugin-api#output-generation-hooks), and [`dynamicImportInCjs`](https://rolldown.rs/reference/outputoptions.dynamicimportincjs).
2. **Resolve returned-AST typing deliberately.** The current Babel/environment paths run successfully in the spike, including `this.parse` and AST metadata. Rolldown's declared `TransformResult`/`SourceDescription` surface does not accept Rollup's returned `ast`, however. Either stop returning it while retaining `meta.babel`, or isolate a documented compatibility cast and benchmark the reparsing cost. See [`packages/cli/src/rollup-plugins/babel.ts`](../packages/cli/src/rollup-plugins/babel.ts), [`packages/cli/src/rollup-plugins/inline-process-env-node-env.ts`](../packages/cli/src/rollup-plugins/inline-process-env-node-env.ts), and [Rolldown transform hook types](https://rolldown.rs/reference/Interface.FunctionPluginHooks#transform).
3. **Close generated bundles.** `buildPackage` currently never closes them. Wrap each `rolldown()` result so `bundle.close()` runs after all `generate()` calls, including failures. [Rolldown build lifecycle](https://rolldown.rs/reference/interface.rolldownbuild)
4. **Audit errors and warnings instead of preserving the handler verbatim.** `onwarn` remains available but is deprecated in favor of `onLog`; Rolldown throws a `BundleError` whose optional `errors` array contains individual failures. The current warning formatter assumes Rollup warning codes and fields, and `retryableBuild` assumes a directly thrown error with `pluginCode`. Both paths need fixture coverage. See [`packages/cli/src/build/rollup.ts`](../packages/cli/src/build/rollup.ts), [`packages/cli/src/build/index.ts`](../packages/cli/src/build/index.ts), [`onLog`](https://rolldown.rs/reference/InputOptions.onLog), and [`BundleError`](https://rolldown.rs/reference/typealias.bundleerror).
5. **Convert plugin and config types.** Custom plugins import `Plugin`, `SourceDescription`, `SourceMapInput`, `RollupOptions`, and output types from Rollup. Rolldown is highly compatible but not type-identical; the first spike should use Rolldown's types and resolve each difference rather than masking the whole stack with `any`. Rolldown and tsdown explicitly warn that Rollup plugin types are not 100% compatible. [Rolldown plugin API](https://rolldown.rs/apis/plugin-api), [tsdown type-compatibility note](https://tsdown.dev/advanced/plugins#rollup-plugins)

### Plugin-by-plugin risk

| Area | Assessment | Reason / action |
| --- | --- | --- |
| `throw-warnings` | Medium | `buildEnd` is supported, but warning codes/shapes and multi-error wrapping differ. Assert the exact user-facing diagnostics. |
| Optional Babel path | Medium | The full suite proves `resolveId`, virtual `load`, `transform`, `this.parse`, metadata, helpers, and current output work at runtime. Returned-AST typing still needs an explicit decision. Preserve this path for projects that set `preconstruct.transform: "babel"`. |
| TypeScript declarations | Low-medium | All declaration snapshots pass, including entry/chunk metadata and emitted assets. Add consumer type-resolution checks before release. |
| React Server Components | Low-medium | All current directive/boundary fixtures pass despite this plugin's dense use of graph, metadata, emitted-chunk, and render APIs. Broader consumer fixtures remain prudent. [emitted chunks](https://rolldown.rs/reference/interface.emittedchunk), [directives](https://rolldown.rs/in-depth/directives) |
| Flow, prod/dev proxy, `.mjs` proxy | Low | Current generated filenames, export lists, and snapshots pass unchanged. |
| Runtime-helper rewrite and Terser | Low | Current `renderChunk` behavior and minified snapshots pass. Keep both initially; adopting built-in minification would be a separate output change. |
| Official alias/CommonJS/JSON/node-resolve/replace plugins | Medium-high initially | Rolldown provides native equivalents and warns that built-ins are faster, but swapping resolution, CJS interop, browser-field behavior, and replacement semantics at the same time could change published packages. See staged approach below. [built-in equivalents](https://rolldown.rs/guide/troubleshooting#leverage-built-in-features) |

### Output behavior that must be treated as public compatibility

- CJS default/named export interop, `__esModule` marking, Babel runtime-helper interop, and the generated `.mjs` default proxy.
- Exact UMD globals, browser/package resolution, source maps, minification, and filename/hash patterns.
- Multi-entry shared chunks and `facadeModuleId`/export metadata used by declaration and proxy plugins.
- Custom import-condition outputs, `type: "module"` packages, Node ESM execution, and dynamic imports in CJS.
- React `"use client"` / `"use server"` directives and emitted client-boundary chunks.
- Warning/error text and aggregation, because the CLI intentionally converts warnings to scoped fatal errors.
- Watch startup/rebuild/error behavior and cleanup.

Rolldown has intentional semantic differences beyond missing hooks. Its troubleshooting guide notes that it does not always preserve exported-function `this` binding or temporal-dead-zone failures. Its CJS model follows esbuild-like heuristics rather than `@rollup/plugin-commonjs`. Those differences may be reasonable for applications but matter more for a general-purpose library builder whose inputs are arbitrary user code. [troubleshooting semantics](https://rolldown.rs/guide/troubleshooting), [CJS support](https://rolldown.rs/guide/notable-features#cjs-support), [CJS details](https://rolldown.rs/in-depth/bundling-cjs)

## Benefits likely for this repository

- **Faster graph construction, parsing, linking, chunking, and rendering.** Rolldown is Rust-native and designed as a fast Rollup-compatible bundler. Vite reports 10–30x versus Rollup in its benchmark context and large real-world Vite reductions, but those numbers should not be projected onto Preconstruct without measurement. [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)
- **Less JavaScript plugin work over time.** Rolldown natively handles Node-style resolution, mixed CJS/ESM, JSON, aliases, replacement, TypeScript/JSX transforms, and minification. Its documentation recommends native features because work can stay in Rust and run in parallel. [notable features](https://rolldown.rs/guide/notable-features), [built-in equivalents](https://rolldown.rs/guide/troubleshooting#leverage-built-in-features)
- **A maintained modern bundler base.** The repository is on Rollup 2, whereas Rolldown 1.x has a current compatible API and is already the stable production bundler in Vite 8. This avoids first paying for a Rollup 2-to-4 migration if Rolldown is the desired destination. [Rolldown 1.0 release](https://github.com/rolldown/rolldown/releases/tag/v1.0.0), [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)

The ceiling may be lower here than headline benchmarks: Babel transforms run in `jest-worker`, declaration generation invokes TypeScript, Terser runs separately, and several output plugins execute in JavaScript. Rolldown itself says plugins and JavaScript/Rust communication can dominate builds and recommends hook filters and built-ins. Benchmark cold build, warm/repeated build, multi-package build, and watch rebuild separately. [performance guidance](https://rolldown.rs/guide/troubleshooting#performance)

## Maturity and operational risk

Rolldown 1.x is stable, not a preview, and Vite 8 uses it by default. That substantially lowers ecosystem risk compared with evaluating `rolldown-vite` before 2026. [Rolldown 1.0 release](https://github.com/rolldown/rolldown/releases/tag/v1.0.0), [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)

Stable does not mean identical to Rollup. The current plugin docs call the API “almost fully compatible” and still list `shouldTransformCachedModule`, `resolveImportMeta`, `resolveFileUrl`, and `renderDynamicImport` as unsupported. Some newer Rolldown features remain explicitly experimental and may change without a major release. Preconstruct uses one unsupported hook today. [plugin API](https://rolldown.rs/apis/plugin-api), [Rolldown options](https://rolldown.rs/reference/Interface.RolldownOptions)

Rolldown ships native binaries. Tier-1 builds cover Linux x64/arm64 glibc, Windows x64, and Apple x64/arm64; other targets range from tier 2 to WASM fallback. This is broader than the most common CI/user platforms but is still a packaging and installation change from pure-JavaScript Rollup. Because `@preconstruct/cli` is installed on end-user development machines, publish/install tests should cover every platform the project promises, plus Yarn 1's handling of optional platform packages and the documented WASM fallback. More importantly, `rolldown@1.1.5` itself requires Node `^20.19.0 || >=22.12.0`; if Preconstruct still intends to support Node 16/18 or earlier Node 20 patch releases, a production switch is blocked until that policy or upstream requirement changes. [platform matrix](https://rolldown.rs/guide/getting-started#installation), [`rolldown@1.1.5` package](https://www.npmjs.com/package/rolldown/v/1.1.5)

## Proposed staged experiment

1. **Make the Node-runtime product decision and declare the matrix.** Rolldown 1.1.5 requires Node `^20.19.0 || >=22.12.0`; the current local Node `20.20.2` passes, but the repository itself does not declare this floor. Decide whether that is acceptable for all CLI consumers, then add it to package metadata/docs and create explicit CI jobs for the oldest supported Node release and representative Linux, Windows, Apple x64, and Apple arm64 hosts. Test packed-tarball installation, not only a workspace checkout. [`rolldown@1.1.5` package](https://www.npmjs.com/package/rolldown/v/1.1.5)
2. **Retain the now-established baseline.** Rollup passes 128/128 in 60.5 seconds and the runtime-substituted Rolldown build passes the same suite/snapshots in 61.6 seconds on Node 20.20.2 with `--no-watchman`. Also save peak memory if practical, emitted file manifests/hashes, and runtime checks for representative fixtures. Include all output kinds and a large real-world monorepo fixture; the current suite is too small and dominated by non-bundler work. Avoid network-dependent fixtures in benchmark runs.
3. **Make the minimum direct-API port first.** Retain the current Babel transform temporarily to isolate bundler compatibility while adapting imports/types, the dynamic-import option, bundle cleanup, and documented error handling. The successful shim establishes the expected output baseline.
4. **Introduce the intended compiler split.** Add `preconstruct.transform: "oxc" | "babel"` with `"oxc"` as the default. Make both build and dev obey the same choice, then move Babel-specific packages off the default dependency path.
5. **Run differential CI.** Compare Rollup+Babel, Rolldown+Oxc, and Rolldown+Babel fixtures. Check file lists, exports, source maps, declarations, runtime import/require behavior, and intentional syntax/output differences.
6. **Gate an experimental release.** Gather compatibility feedback and timings from large consumer repositories before making the new default generally available.
7. **Adopt other native features one at a time.** A sensible order is JSON, node resolution, alias, replace, CommonJS, then minification. Each removal gets its own differential fixtures and benchmark. The Babel option remains a supported escape hatch, not the default pipeline.
8. **Exit criteria for making it default:** all supported platform installs pass; full build/watch suites pass in both compiler modes; default JSX/TypeScript/target semantics are documented; Flow/ES5/custom-Babel users receive a clear opt-in path; error UX remains acceptable; at least one representative large repository shows a material cold-build or rebuild win; and rollback remains possible for one release cycle.

## Bottom line

**The switch is technically plausible, but not yet economically proven.** The isolated backend substitution already passes the full targeted suite and existing outputs, so custom plugin compatibility is no longer the main concern. The target is `preconstruct.transform: "oxc" | "babel"`, defaulting to `"oxc"`. The decisive gates are accepting Node `^20.19.0 || >=22.12.0`, defining the new transform contract, and showing a material build/watch improvement on a representative consumer—the bundler-only suite shows none.
