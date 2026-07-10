import build from "../";
import {
  snapshotDirectory,
  install,
  testdirWithLegacyPreconstructDefaults as testdir,
  js,
  getDist,
  basicPkgJson,
  ts,
  repoNodeModules,
  typescriptFixture,
  getFiles,
  stripHashes,
} from "../../../test-utils";
import { doPromptInput } from "../../prompt";
import type { MockedFunction } from "vitest";

vi.mock("../../prompt");

vi.setConfig({ testTimeout: 30000 });

afterEach(() => {
  vi.resetAllMocks();
});

test("browser", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "browser",
      main: "dist/browser.cjs.js",
      module: "dist/browser.esm.js",
      browser: {
        "./dist/browser.cjs.js": "./dist/browser.browser.cjs.js",
        "./dist/browser.esm.js": "./dist/browser.browser.esm.js",
      },
    }),
    "src/index.js": js`
      let thing = "wow";

      if (typeof window !== "undefined") {
        thing = "something";
      }

      if (typeof document !== undefined) {
        thing += "other";
      }

      export default thing;
    `,
  });

  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.browser.cjs.js, dist/browser.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          Object.defineProperties(exports, {
          	__esModule: { value: true },
          	[Symbol.toStringTag]: { value: "Module" }
          });
          //#region src/index.js
          let thing = "wow";
          if (typeof window !== "undefined") thing = "something";
          thing += "other";
          var src_default = thing;
          //#endregion
          exports.default = src_default;

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.browser.esm.js, dist/browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          //#region src/index.js
          let thing = "wow";
          if (typeof window !== "undefined") thing = "something";
          thing += "other";
          var src_default = thing;
          //#endregion
          export { src_default as default };
        `);
});

test("browser no module", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "browser-no-module",
      main: "dist/browser-no-module.cjs.js",

      browser: {
        "./dist/browser-no-module.cjs.js":
          "./dist/browser-no-module.browser.cjs.js",
      },
    }),

    "src/index.js": js`
      let thing = "wow";

      if (typeof window !== "undefined") {
        thing = "something";
      }

      if (typeof document !== undefined) {
        thing += "other";
      }

      export default thing;
    `,
  });

  await build(tmpPath);
  await snapshotDirectory(tmpPath, { files: "all" });
});

test("typescript", async () => {
  let dir = await testdir(typescriptFixture);

  await build(dir);

  expect(await getDist(dir)).toMatchInlineSnapshot(`
        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/another-thing.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        export type SomeType = string;

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        import { SomeType } from "./another-thing.js";
        export * from "./one-more-thing.js";
        import * as path from "path";
        export { path };
        declare let thing: SomeType;
        export default thing;

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/one-more-thing.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        declare var obj: object;

        export { obj };
        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        export * from "./declarations/src/index.js";
        export { default } from "./declarations/src/index.js";
        //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        Object.defineProperties(exports, {
        	__esModule: { value: true },
        	[Symbol.toStringTag]: { value: "Module" }
        });
        //#region \\0rolldown/runtime.js
        var __create = Object.create;
        var __defProp = Object.defineProperty;
        var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames = Object.getOwnPropertyNames;
        var __getProtoOf = Object.getPrototypeOf;
        var __hasOwnProp = Object.prototype.hasOwnProperty;
        var __copyProps = (to, from, except, desc) => {
        	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
        		key = keys[i];
        		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
        			get: ((k) => from[k]).bind(null, key),
        			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        		});
        	}
        	return to;
        };
        var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
        	value: mod,
        	enumerable: true
        }) : target, mod));
        //#endregion
        let path = require("path");
        path = __toESM(path);
        //#region src/one-more-thing.js
        let obj = {};
        //#endregion
        //#region src/index.ts
        let thing = "something";
        //#endregion
        exports.default = thing;
        exports.obj = obj;
        Object.defineProperty(exports, "path", {
        	enumerable: true,
        	get: function() {
        		return path;
        	}
        });

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        import * as path from "path";
        //#region src/one-more-thing.js
        let obj = {};
        //#endregion
        //#region src/index.ts
        let thing = "something";
        //#endregion
        export { thing as default, obj, path };
      `);
});

test("typescript with forced dts emit", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "typescript-force-dts-emit",
      main: "dist/typescript-force-dts-emit.cjs.js",
      module: "dist/typescript-force-dts-emit.esm.js",

      dependencies: {
        "@babel/runtime": "^7.8.7",
        "@reduxjs/toolkit": "^1.3.5",
      },

      devDependencies: {
        "@types/node": "^12.7.1",
        "@types/webpack-env": "^1.15.1",
        typescript: "^3.8.3",
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [
        require.resolve("@babel/preset-env"),
        require.resolve("@babel/preset-typescript"),
      ],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "tsconfig.json": `{
  "compilerOptions": {
    /* Basic Options */
    "target": "esnext" /* Specify ECMAScript target version: 'ES3' (default), 'ES5', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019' or 'ESNEXT'. */,
    "module": "commonjs" /* Specify module code generation: 'none', 'commonjs', 'amd', 'system', 'umd', 'es2015', or 'ESNext'. */,
    // "lib": [],                             /* Specify library files to be included in the compilation. */
    // "allowJs": true,                       /* Allow javascript files to be compiled. */
    // "checkJs": true,                       /* Report errors in .js files. */
    // "jsx": "preserve",                     /* Specify JSX code generation: 'preserve', 'react-native', or 'react'. */
    // "declaration": true,                   /* Generates corresponding '.d.ts' file. */
    // "declarationMap": true,                /* Generates a sourcemap for each corresponding '.d.ts' file. */
    // "sourceMap": true,                     /* Generates corresponding '.map' file. */
    // "outFile": "./",                       /* Concatenate and emit output to single file. */
    // "outDir": "./",                        /* Redirect output structure to the directory. */
    // "rootDir": "./",                       /* Specify the root directory of input files. Use to control the output directory structure with --outDir. */
    // "composite": true,                     /* Enable project compilation */
    // "incremental": true,                   /* Enable incremental compilation */
    // "tsBuildInfoFile": "./",               /* Specify file to store incremental compilation information */
    // "removeComments": true,                /* Do not emit comments to output. */
    // "noEmit": true,                        /* Do not emit outputs. */
    // "importHelpers": true,                 /* Import emit helpers from 'tslib'. */
    // "downlevelIteration": true,            /* Provide full support for iterables in 'for-of', spread, and destructuring when targeting 'ES5' or 'ES3'. */
    "isolatedModules": true,               /* Transpile each file as a separate module (similar to 'ts.transpileModule'). */

    /* Strict Type-Checking Options */
    "strict": true /* Enable all strict type-checking options. */,
    // "noImplicitAny": true,                 /* Raise error on expressions and declarations with an implied 'any' type. */
    // "strictNullChecks": true,              /* Enable strict null checks. */
    // "strictFunctionTypes": true,           /* Enable strict checking of function types. */
    // "strictBindCallApply": true,           /* Enable strict 'bind', 'call', and 'apply' methods on functions. */
    // "strictPropertyInitialization": true,  /* Enable strict checking of property initialization in classes. */
    // "noImplicitThis": true,                /* Raise error on 'this' expressions with an implied 'any' type. */
    // "alwaysStrict": true,                  /* Parse in strict mode and emit "use strict" for each source file. */

    /* Additional Checks */
    // "noUnusedLocals": true,                /* Report errors on unused locals. */
    // "noUnusedParameters": true,            /* Report errors on unused parameters. */
    // "noImplicitReturns": true,             /* Report error when not all code paths in function return a value. */
    // "noFallthroughCasesInSwitch": true,    /* Report errors for fallthrough cases in switch statement. */

    /* Module Resolution Options */
    // "moduleResolution": "node",            /* Specify module resolution strategy: 'node' (Node.js) or 'classic' (TypeScript pre-1.6). */
    // "baseUrl": "./",                       /* Base directory to resolve non-absolute module names. */
    // "paths": {},                           /* A series of entries which re-map imports to lookup locations relative to the 'baseUrl'. */
    // "rootDirs": [],                        /* List of root folders whose combined content represents the structure of the project at runtime. */
    // "typeRoots": [],                       /* List of folders to include type definitions from. */
    // "types": [],                           /* Type declaration files to be included in compilation. */
    // "allowSyntheticDefaultImports": true,  /* Allow default imports from modules with no default export. This does not affect code emit, just typechecking. */
    "esModuleInterop": true /* Enables emit interoperability between CommonJS and ES Modules via creation of namespace objects for all imports. Implies 'allowSyntheticDefaultImports'. */,
    // "preserveSymlinks": true,              /* Do not resolve the real path of symlinks. */

    /* Source Map Options */
    // "sourceRoot": "",                      /* Specify the location where debugger should locate TypeScript files instead of source locations. */
    // "mapRoot": "",                         /* Specify the location where debugger should locate map files instead of generated locations. */
    // "inlineSourceMap": true,               /* Emit a single file with source maps instead of having a separate file. */
    // "inlineSources": true,                 /* Emit the source alongside the sourcemaps within a single file; requires '--inlineSourceMap' or '--sourceMap' to be set. */

    /* Experimental Options */
    // "experimentalDecorators": true,        /* Enables experimental support for ES7 decorators. */
    // "emitDecoratorMetadata": true,         /* Enables experimental support for emitting type metadata for decorators. */
    "noEmit": true
  }
}
`,

    "src/create-store.ts": ts`
      // @ts-ignore (installed during test)
      import { configureStore, Action } from "@reduxjs/toolkit";
      import { ThunkAction } from "redux-thunk";
      import { rootReducer, RootState } from "./root-reducer";

      export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;

      export function createStore() {
        return configureStore<RootState>({
          reducer: rootReducer,
        });
      }
    `,

    "src/index.ts": ts`
      export { createStore } from "./create-store";
      export type { AppThunk } from "./create-store";
      export type { RootState } from "./root-reducer";
    `,

    "src/root-reducer.ts": ts`
      // @ts-ignore (installed during test)
      import { combineReducers } from "@reduxjs/toolkit";

      export const rootReducer = combineReducers({
        /* blah blah blah */
      });

      export type RootState = ReturnType<typeof rootReducer>;
    `,
  });

  await build(tmpPath);

  await snapshotDirectory(tmpPath, {
    files: "all",
    filterPath: (fp) => fp.startsWith("dist/"),
  });
});

test("package resolvable but not in deps", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "package-resolvable-but-not-in-deps",
      main: "dist/package-resolvable-but-not-in-deps.cjs.js",

      devDependencies: {
        react: "16.8.6",
      },
    }),

    "src/index.js": js`
      import React from "react";

      export default React.createContext("something");
    `,
  });
  await install(tmpPath);
  try {
    await build(tmpPath);
  } catch (err) {
    expect(err.message).toMatchInlineSnapshot(
      `
      "🎁 package-resolvable-but-not-in-deps Error: Build failed with 1 error:
      🎁 package-resolvable-but-not-in-deps
      🎁 package-resolvable-but-not-in-deps [plugin throw-warnings]
      🎁 package-resolvable-but-not-in-deps Error: 🎁 package-resolvable-but-not-in-deps "react" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
      🎁 package-resolvable-but-not-in-deps     at PluginContextImpl.buildEnd (/Users/emma/projects/preconstruct/packages/cli/src/build/rollup.ts:159:19)
      🎁 package-resolvable-but-not-in-deps     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1406:18)
      🎁 package-resolvable-but-not-in-deps     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:18)
      🎁 package-resolvable-but-not-in-deps     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
      🎁 package-resolvable-but-not-in-deps     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
      🎁 package-resolvable-but-not-in-deps     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
      🎁 package-resolvable-but-not-in-deps     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
      🎁 package-resolvable-but-not-in-deps     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
      🎁 package-resolvable-but-not-in-deps     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
      🎁 package-resolvable-but-not-in-deps     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
      🎁 package-resolvable-but-not-in-deps     at Module.build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
      🎁 package-resolvable-but-not-in-deps     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/other.ts:344:5
      🎁 package-resolvable-but-not-in-deps     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
      🎁 package-resolvable-but-not-in-deps   errors: [Getter/Setter]
      🎁 package-resolvable-but-not-in-deps }"
    `
    );
    return;
  }
  expect(true).toBe(false);
});

test("package with exports resolvable", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "package-exports-resolvable-but-not-in-deps",
      main: "dist/package-exports-resolvable-but-not-in-deps.cjs.js",
      "umd:main": "dist/package-exports-resolvable-but-not-in-deps.umd.min.js",
      dependencies: {
        "@atomico/hooks": "0.0.0",
      },
      preconstruct: {
        umdName: "packageExportsResolvableButNotInDeps",
      },
    }),
    "node_modules/@atomico/hooks/package.json": JSON.stringify({
      name: "@atomico/hooks/use-slot",
      exports: {
        "./use-slot": "./something/use-slot.js",
      },
    }),
    "node_modules/@atomico/hooks/something/use-slot.js": js`
      export function useSlot(ref) {
        console.log(ref);
      }
    `,
    "src/index.js": js`
      import { useSlot } from "@atomico/hooks/use-slot";

      export default function useChildren(ref) {
        return useSlot(ref);
      }
    `,
  });

  await build(tmpPath);

  expect(
    await getFiles(tmpPath, [
      "dist/package-exports-resolvable-but-not-in-deps.umd.min.js",
    ])
  ).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/package-exports-resolvable-but-not-in-deps.umd.min.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    (function(e,t){typeof exports==\`object\`&&typeof module<\`u\`?module.exports=t():typeof define==\`function\`&&define.amd?define([],t):(e=typeof globalThis<\`u\`?globalThis:e||self,e.packageExportsResolvableButNotInDeps=t())})(this,function(){function e(e){console.log(e)}function t(t){return e(t)}return t});
    //# sourceMa${""}ppingURL=package-exports-resolvable-but-not-in-deps.umd.min.js.map//# sourceMa${""}ppingURL=package-exports-resolvable-but-not-in-deps.umd.min.js.map
  `);
});

test("entrypoint outside package directory", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "entrypoint-outside-pkg-dir",

      preconstruct: {
        packages: ["pkg-a"],
      },
    }),

    "some-file.js": js`
      export let something = true;
    `,

    "pkg-a/package.json": JSON.stringify({
      name: "@entrypoint-outside-pkg-dir/pkg-a",
      main: "dist/pkg-a.cjs.js",

      preconstruct: {
        entrypoints: ["../../some-file.js"],
      },
    }),
  });
  try {
    await build(tmpPath);
  } catch (err) {
    expect(err.message).toMatchInlineSnapshot(
      `"entrypoint source files must be inside of the src directory of a package but ../some-file.js is not"`
    );
    return;
  }
  expect(true).toBe(false);
});

test("module imported outside package directory", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "imports-outside-pkg-dir",

      preconstruct: {
        packages: ["pkg-a"],
      },
    }),

    "some-file.js": js`
      export let something = true;
    `,

    "pkg-a/package.json": JSON.stringify({
      name: "@imports-outside-pkg-dir/pkg-a",
      main: "dist/imports-outside-pkg-dir-pkg-a.cjs.js",
    }),

    "pkg-a/src/index.js": js`
      export { something } from "../../some-file";
    `,
  });
  try {
    await build(tmpPath);
  } catch (err) {
    expect(err.message).toMatchInlineSnapshot(
      `
      "🎁 @imports-outside-pkg-dir/pkg-a Error: Build failed with 1 error:
      🎁 @imports-outside-pkg-dir/pkg-a
      🎁 @imports-outside-pkg-dir/pkg-a [plugin throw-warnings]
      🎁 @imports-outside-pkg-dir/pkg-a Error: 🎁 @imports-outside-pkg-dir/pkg-a all relative imports in a package should only import modules inside of their package directory but "src/index.js" is importing "../../some-file"
      🎁 @imports-outside-pkg-dir/pkg-a     at PluginContextImpl.buildEnd (/Users/emma/projects/preconstruct/packages/cli/src/build/rollup.ts:159:19)
      🎁 @imports-outside-pkg-dir/pkg-a     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1406:18)
      🎁 @imports-outside-pkg-dir/pkg-a     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:18)
      🎁 @imports-outside-pkg-dir/pkg-a     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
      🎁 @imports-outside-pkg-dir/pkg-a     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
      🎁 @imports-outside-pkg-dir/pkg-a     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
      🎁 @imports-outside-pkg-dir/pkg-a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
      🎁 @imports-outside-pkg-dir/pkg-a     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
      🎁 @imports-outside-pkg-dir/pkg-a     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
      🎁 @imports-outside-pkg-dir/pkg-a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
      🎁 @imports-outside-pkg-dir/pkg-a     at Module.build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
      🎁 @imports-outside-pkg-dir/pkg-a     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/other.ts:478:5
      🎁 @imports-outside-pkg-dir/pkg-a     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
      🎁 @imports-outside-pkg-dir/pkg-a   errors: [Getter/Setter]
      🎁 @imports-outside-pkg-dir/pkg-a }"
    `
    );
    return;
  }
  expect(true).toBe(false);
});

test("using external @babel/runtime helpers", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "external-babel-runtime",
      main: "dist/external-babel-runtime.cjs.js",
      module: "dist/external-babel-runtime.esm.js",

      dependencies: {
        "@babel/runtime": "^7.0.0",
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
      plugins: [require.resolve("@babel/plugin-transform-runtime")],
    }),
    "src/index.js": js`
      export default class Foo {}
    `,
  });

  await install(tmpPath);
  await build(tmpPath);

  await snapshotDirectory(tmpPath, { files: "all" });
});

test("should lazily get globals", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "umd-unused-peer-dep",
      main: "dist/umd-unused-peer-dep.cjs.js",
      "umd:main": "dist/umd-unused-peer-dep.umd.min.js",

      preconstruct: {
        umdName: "validPackage",
      },

      peerDependencies: {
        react: "^16.11.0",
      },
    }),

    "src/index.js": js`
      export default "something";
    `,
  });

  (doPromptInput as MockedFunction<
    typeof doPromptInput
  >).mockImplementation((question, { name }, thing) => {
    console.log("called");
    throw new Error(
      `this should never be called: ${JSON.stringify({
        question,
        name,
        thing,
      })}`
    );
  });

  await build(tmpPath);

  await snapshotDirectory(tmpPath);
});

test("batches build errors", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "errors",
      main: "index.js",

      preconstruct: {
        packages: ["packages/*"],
      },

      workspaces: ["packages/*"],
    }),

    "packages/package-one/package.json": JSON.stringify({
      name: "@errors/package-one",
      main: "dist/errors-package-one.cjs.js",
      license: "MIT",
      private: true,
    }),

    "packages/package-two/package.json": JSON.stringify({
      name: "@errors/package-two",
      main: "dist/errors-package-two.cjs.js",
      license: "MIT",
      private: true,
    }),

    "packages/package-one/src/index.js": js`
      import "something";
      import "something-2";
    `,

    "packages/package-two/src/index.js": js`
      import "something";
      import "something-2";
    `,
  });
  let error;
  try {
    await build(tmpPath);
    throw new Error("should never happen");
  } catch (err) {
    error = err;
  }
  expect(error).toMatchInlineSnapshot(`
    [Error: 🎁 @errors/package-one Error: Build failed with 1 error:
    🎁 @errors/package-one
    🎁 @errors/package-one [plugin throw-warnings]
    🎁 @errors/package-one Error: 🎁 @errors/package-one "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 @errors/package-one 🎁 @errors/package-one "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 @errors/package-one     at PluginContextImpl.buildEnd (/Users/emma/projects/preconstruct/packages/cli/src/build/rollup.ts:159:19)
    🎁 @errors/package-one     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1406:18)
    🎁 @errors/package-one     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:18)
    🎁 @errors/package-one     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
    🎁 @errors/package-one     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
    🎁 @errors/package-one     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
    🎁 @errors/package-one     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
    🎁 @errors/package-one     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
    🎁 @errors/package-one     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
    🎁 @errors/package-one     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
    🎁 @errors/package-one     at Module.build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
    🎁 @errors/package-one     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/other.ts:612:5
    🎁 @errors/package-one     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
    🎁 @errors/package-one   errors: [Getter/Setter]
    🎁 @errors/package-one }
    🎁 @errors/package-two Error: Build failed with 1 error:
    🎁 @errors/package-two
    🎁 @errors/package-two [plugin throw-warnings]
    🎁 @errors/package-two Error: 🎁 @errors/package-two "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 @errors/package-two 🎁 @errors/package-two "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 @errors/package-two     at PluginContextImpl.buildEnd (/Users/emma/projects/preconstruct/packages/cli/src/build/rollup.ts:159:19)
    🎁 @errors/package-two     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1406:18)
    🎁 @errors/package-two     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:18)
    🎁 @errors/package-two     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
    🎁 @errors/package-two     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
    🎁 @errors/package-two     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
    🎁 @errors/package-two     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
    🎁 @errors/package-two     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
    🎁 @errors/package-two     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
    🎁 @errors/package-two     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
    🎁 @errors/package-two     at Module.build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
    🎁 @errors/package-two     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/other.ts:612:5
    🎁 @errors/package-two     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
    🎁 @errors/package-two   errors: [Getter/Setter]
    🎁 @errors/package-two }]
  `);
});

test("builds package using eval", async () => {
  let dir = await testdir({
    "package.json": basicPkgJson(),
    "src/index.js": js`
      export default function compute(arg) {
        return eval(arg);
      }
    `,
  });

  await build(dir);

  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperties(exports, {
    	__esModule: { value: true },
    	[Symbol.toStringTag]: { value: "Module" }
    });
    //#region src/index.js
    function compute(arg) {
    	return eval(arg);
    }
    //#endregion
    exports.default = compute;
  `);
});

test("builds umd with a dependency containing top-level this in ESM", async () => {
  let dir = await testdir({
    "package.json": basicPkgJson({
      umdName: "pkg",
      dependencies: {
        "with-top-level-this-in-esm": "*",
      },
    }),
    "src/index.js": js`
      export { default } from "with-top-level-this-in-esm";
    `,
    "node_modules/with-top-level-this-in-esm/package.json": JSON.stringify({
      name: "with-top-level-this-in-esm",
    }),
    "node_modules/with-top-level-this-in-esm/index.js": js`
      // output transpiled by TS with inlined tslib helper
      var __assign =
        (this && this.__assign) ||
        function () {
          __assign =
            Object.assign ||
            function (t) {
              for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                  if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
              }
              return t;
            };
          return __assign.apply(this, arguments);
        };
      var foo = { bar: 42 };
      export default __assign({}, foo);
    `,
  });

  await build(dir);

  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperties(exports, {
    	__esModule: { value: true },
    	[Symbol.toStringTag]: { value: "Module" }
    });
    //#region \\0rolldown/runtime.js
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
    	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
    		key = keys[i];
    		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
    			get: ((k) => from[k]).bind(null, key),
    			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    		});
    	}
    	return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
    	value: mod,
    	enumerable: true
    }) : target, mod));
    //#endregion
    let with_top_level_this_in_esm = require("with-top-level-this-in-esm");
    with_top_level_this_in_esm = __toESM(with_top_level_this_in_esm);
    Object.defineProperty(exports, "default", {
    	enumerable: true,
    	get: function() {
    		return with_top_level_this_in_esm.default;
    	}
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    (function(e,t){typeof exports==\`object\`&&typeof module<\`u\`?module.exports=t():typeof define==\`function\`&&define.amd?define([],t):(e=typeof globalThis<\`u\`?globalThis:e||self,e.pkg=t())})(this,function(){var e=function(){return e=Object.assign||function(e){for(var t,n=1,r=arguments.length;n<r;n++)for(var i in t=arguments[n],t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i]);return e},e.apply(this,arguments)};return e({},{bar:42})});
    //# sourceMa${""}ppingURL=pkg.umd.min.js.map//# sourceMa${""}ppingURL=pkg.umd.min.js.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg.umd.min.js","names":[],"sources":["../node_modules/with-top-level-this-in-esm/index.js"],"sourcesContent":["// output transpiled by TS with inlined tslib helper\\nvar __assign =\\n  (this && this.__assign) ||\\n  function () {\\n    __assign =\\n      Object.assign ||\\n      function (t) {\\n        for (var s, i = 1, n = arguments.length; i < n; i++) {\\n          s = arguments[i];\\n          for (var p in s)\\n            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];\\n        }\\n        return t;\\n      };\\n    return __assign.apply(this, arguments);\\n  };\\nvar foo = { bar: 42 };\\nexport default __assign({}, foo);"],"x_google_ignoreList":[0],"mappings":"0MACA,IAAI,EAEF,UAAY,CAWV,MAVA,GACE,OAAO,QACP,SAAU,EAAG,CACX,IAAK,IAAI,EAAG,EAAI,EAAG,EAAI,UAAU,OAAQ,EAAI,EAAG,IAE9C,IAAK,IAAI,IADT,GAAI,UAAU,GACA,EACR,OAAO,UAAU,eAAe,KAAK,EAAG,CAAC,IAAG,EAAE,GAAK,EAAE,IAE7D,OAAO,CACT,EACK,EAAS,MAAM,KAAM,SAAS,CACvC,SAEa,EAAS,CAAC,EAAG,CADhB,IAAK,EACW"}
  `);
});

test(".d.ts", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
    }),
    "src/index.js": js`
      export const x = "hello";
    `,
    "src/index.d.ts": ts`
      export const x: string;
    `,
    node_modules: { kind: "symlink", path: repoNodeModules },
    "tsconfig.json": typescriptFixture["tsconfig.json"],
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export const x: string;
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi9kZWNsYXJhdGlvbnMvc3JjL2luZGV4LmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    //#region src/index.js
    const x = "hello";
    //#endregion
    exports.x = x;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    //#region src/index.js
    const x = "hello";
    //#endregion
    export { x };
  `);
});

test("simple use client", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
    }),
    "src/index.js": js`
      export { A } from "./client";
    `,
    "src/client.js": js`
      "use client";
      export const A = "something";
      console.log("client");
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"], stripHashes("client")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-666cfcd2500cae30c5a50dab6c18a7e2.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/client.js
      const A = "something";
      console.log("client");
      //#endregion
      export { A };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-b11ab0fac70c8fbe4ae59421af73c245.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/client.js
      const A = "something";
      console.log("client");
      //#endregion
      exports.A = A;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/client.js
      var client_exports = /* @__PURE__ */ __exportAll({});
      __reExport(client_exports, require("./client-some-hash.cjs.js"));
      //#endregion
      Object.defineProperty(exports, "A", {
      	enumerable: true,
      	get: function() {
      		return client_exports.A;
      	}
      });

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/client.js
      var client_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client from "./client-some-hash.esm.js";
      __reExport(client_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client);
      //#endregion
      var A = client_exports.A;
      export { A };
    `);
});
test("use client", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
    }),
    "src/index.js": js`
      export { A } from "./client";
      export { C } from "./c";
      export { B } from "./b";
    `,
    "src/client.js": js`
      "use client";
      export const A = "something";
    `,
    "src/b.js": js`
      export const B = "b";
    `,
    "src/c.js": js`
      import { D } from "./d";
      export function C() {
        return D;
      }
    `,
    "src/d.js": js`
      "use client";
      export const D = "d";
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"], stripHashes("client", "d")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-53f4b26e873a46577262c23cfb2b3286.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/client.js
      const A = "something";
      //#endregion
      export { A };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-597c7d25a1f9a66672bdcea9b63eb4c0.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/client.js
      const A = "something";
      //#endregion
      exports.A = A;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/d-this-is-not-the-real-hash-d79e706d60bd0b5c5ed881cf51f8a855.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/d.js
      const D = "d";
      //#endregion
      export { D };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/d-this-is-not-the-real-hash-e3e8fa0b8537554da8576ca07669438e.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/d.js
      const D = "d";
      //#endregion
      exports.D = D;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/client.js
      var client_exports = /* @__PURE__ */ __exportAll({});
      __reExport(client_exports, require("./client-some-hash.cjs.js"));
      //#endregion
      //#region \\0preserve boundary:0src/d.js
      var d_exports = /* @__PURE__ */ __exportAll({});
      __reExport(d_exports, require("./d-some-hash.cjs.js"));
      //#endregion
      //#region src/c.js
      function C() {
      	return d_exports.D;
      }
      //#endregion
      //#region src/b.js
      const B = "b";
      //#endregion
      Object.defineProperty(exports, "A", {
      	enumerable: true,
      	get: function() {
      		return client_exports.A;
      	}
      });
      exports.B = B;
      exports.C = C;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/client.js
      var client_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client from "./client-some-hash.esm.js";
      __reExport(client_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client);
      //#endregion
      //#region \\0preserve boundary:0src/d.js
      var d_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__WPGYjwIlzWVNM1bYhOc83w__USE_CLIENT_IMPORT___d from "./d-some-hash.esm.js";
      __reExport(d_exports, import___USE_CLIENT_IMPORT__WPGYjwIlzWVNM1bYhOc83w__USE_CLIENT_IMPORT___d);
      //#endregion
      //#region src/c.js
      function C() {
      	return d_exports.D;
      }
      //#endregion
      //#region src/b.js
      const B = "b";
      //#endregion
      var A = client_exports.A;
      export { A, B, C };
    `);
});

test("use client as entrypoint", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
    }),
    "src/index.js": js`
      "use client";
      export const a = true;
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    "use client";
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    //#region src/index.js
    const a = true;
    //#endregion
    exports.a = a;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    "use client";
    //#region src/index.js
    const a = true;
    //#endregion
    export { a };
  `);
});

test("use client with typescript", async () => {
  const dir = await testdir({
    ...typescriptFixture,
    "src/index.ts": ts`
      export { A } from "./a";
      export { B } from "./b";
    `,
    "src/a.ts": ts`
      "use client";
      export const A = 1;
    `,
    "src/b.ts": ts`
      export const B = 2;
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"], stripHashes("a")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a-this-is-not-the-real-hash-179af0311ae58f099ef74cec7cd90f58.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/a.ts
      const A = 1;
      //#endregion
      exports.A = A;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a-this-is-not-the-real-hash-49ed23373c96c124cb5dcff612b4c05c.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/a.ts
      const A = 1;
      //#endregion
      export { A };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/a.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const A = 1;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/b.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const B = 2;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { A } from "./a.js";
      export { B } from "./b.js";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/a.ts
      var a_exports = /* @__PURE__ */ __exportAll({});
      __reExport(a_exports, require("./a-some-hash.cjs.js"));
      //#endregion
      //#region src/b.ts
      const B = 2;
      //#endregion
      Object.defineProperty(exports, "A", {
      	enumerable: true,
      	get: function() {
      		return a_exports.A;
      	}
      });
      exports.B = B;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/a.ts
      var a_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___a from "./a-some-hash.esm.js";
      __reExport(a_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___a);
      //#endregion
      //#region src/b.ts
      const B = 2;
      //#endregion
      var A = a_exports.A;
      export { A, B };
    `);
});
test("use client as entrypoint with typescript", async () => {
  const dir = await testdir({
    node_modules: { kind: "symlink", path: repoNodeModules },
    "package.json": JSON.stringify({
      name: "typescript",
      main: "dist/typescript.cjs.js",
      module: "dist/typescript.esm.js",
      dependencies: {
        typescript: "^3.4.5",
      },
      preconstruct: {
        entrypoints: ["index.ts", "another.ts"],
      },
    }),
    "another/package.json": JSON.stringify({
      main: "dist/typescript-another.cjs.js",
      module: "dist/typescript-another.esm.js",
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "esnext",
        module: "commonjs",
        strict: true,
        esModuleInterop: true,
        noEmit: true,
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    "src/index.ts": ts`
      "use client";
      export const A = 1;
    `,
    "src/another.ts": ts`
      import { A } from "./index";
      export function something() {
        console.log(A);
      }
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["{another/dist,dist}/**/*.{esm.js,d.ts}"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ another/dist/typescript-another.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../../dist/declarations/src/another.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC1hbm90aGVyLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vZGlzdC9kZWNsYXJhdGlvbnMvc3JjL2Fub3RoZXIuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ another/dist/typescript-another.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/index.ts
      var _preserve_boundary_0src_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___index from "../../dist/src-Cba4ld0B.esm.js";
      __reExport(_preserve_boundary_0src_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___index);
      //#endregion
      //#region src/another.ts
      function something() {
      	console.log(_preserve_boundary_0src_exports.A);
      }
      //#endregion
      export { something };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/another.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare function something(): void;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const A = 1;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/src-BGn3I3qN.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjLUJHbjNJM3FOLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi9kZWNsYXJhdGlvbnMvc3JjL2luZGV4LmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/src-Cba4ld0B.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      import { A } from "./typescript.esm.js";
      export { A };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/index.ts
      const A = 1;
      //#endregion
      export { A };
    `);
});

test("no hoisting client only imports", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
      dependencies: {
        "client-only": "latest",
      },
    }),
    "src/index.js": js`
      export * as x from "./client";
    `,
    "src/client.js": js`
      "use client";
      import "client-only";
      export const a = 1;
      export const b = 1;
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**.esm.js"], stripHashes("client")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-33d4b50f82e3476a7ff85a4ddc95fbbe.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      import "client-only";
      //#region src/client.js
      const a = 1;
      const b = 1;
      //#endregion
      export { a, b };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/client.js
      var client_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client from "./client-some-hash.esm.js";
      __reExport(client_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client);
      //#endregion
      export { client_exports as x };
    `);
});
test("cycle with use client", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
      dependencies: {
        "client-only": "latest",
      },
    }),
    "src/index.js": js`
      import { client } from "./ui";
      import { another } from "./other";

      export async function thing() {
        return a;
      }

      export function other() {
        console.log(another, client);
      }
    `,
    "src/other.js": js`
      import "./index";

      export function another() {
        return c;
      }
    `,
    "src/ui.js": js`
      "use client";
      import "client-only";

      export function client() {
        console.log("a");
      }
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**.esm.js"], stripHashes("ui")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/ui.js
      var ui_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___ui from "./ui-some-hash.esm.js";
      __reExport(ui_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___ui);
      //#endregion
      //#region src/other.js
      function another() {
      	return c;
      }
      //#endregion
      //#region src/index.js
      async function thing() {
      	return a;
      }
      function other() {
      	console.log(another, ui_exports.client);
      }
      //#endregion
      export { other, thing };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/ui-this-is-not-the-real-hash-6611fca7d3a0d82d22ac3bcbfe0ef9bc.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      import "client-only";
      //#region src/ui.js
      function client() {
      	console.log("a");
      }
      //#endregion
      export { client };
    `);
});
test("import use client self", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
      dependencies: {
        "client-only": "latest",
      },
    }),
    "src/index.js": js`
      export { client } from "./ui";
    `,
    "src/ui.js": js`
      "use client";
      import "client-only";
      import * as self from "./ui";

      export function client() {
        console.log("a", self);
      }
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**.esm.js"], stripHashes("ui")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      import { t as ui_exports } from "./ui-some-hash.esm.js";
      var client = ui_exports.client;
      export { client };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/ui-this-is-not-the-real-hash-3fe2055c746e52371b225f73cd2525ec.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      import { t as ui_exports } from "./ui-some-hash.esm.js";
      import "client-only";
      //#region src/ui.js
      function client() {
      	console.log("a", ui_exports);
      }
      //#endregion
      export { client };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/ui-this-is-not-the-real-hash-c70853ee8fcec8cdcb82a953e56cd5fd.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/ui.js
      var ui_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___ui from "./ui-some-hash.esm.js";
      __reExport(ui_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___ui);
      //#endregion
      export { ui_exports as t };
    `);
});
test("import use client self as entrypoint", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
      dependencies: {
        "client-only": "latest",
      },
    }),
    "src/index.js": js`
      "use client";
      import "client-only";
      import * as self from "./index";

      export function client() {
        console.log("a", self);
      }
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**.esm.js"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    "use client";
    import "client-only";
    //#region \\0rolldown/runtime.js
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __exportAll = (all, no_symbols) => {
    	let target = {};
    	for (var name in all) __defProp(target, name, {
    		get: all[name],
    		enumerable: true
    	});
    	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
    	return target;
    };
    var __copyProps = (to, from, except, desc) => {
    	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
    		key = keys[i];
    		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
    			get: ((k) => from[k]).bind(null, key),
    			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    		});
    	}
    	return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    //#endregion
    //#region \\0preserve boundary:0src/index.js
    var _preserve_boundary_0src_exports = /* @__PURE__ */ __exportAll({});
    import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___index from "./src-DdIuPpet.esm.js";
    __reExport(_preserve_boundary_0src_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___index);
    //#endregion
    //#region src/index.js
    function client() {
    	console.log("a", _preserve_boundary_0src_exports);
    }
    //#endregion
    export { client };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/src-DdIuPpet.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    "use client";
    import { client } from "./pkg.esm.js";
    export { client };
  `);
});

test("simple use client with comment above directive", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
    }),
    "src/index.js": js`
      export { A } from "./client";
    `,
    "src/client.js": js`
      /** blah */
      "use client";
      export const A = "something";
      console.log("client");
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"], stripHashes("client")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-25f391c9d4f1808130dee8a963673bd5.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/client.js
      /** blah */
      const A = "something";
      console.log("client");
      //#endregion
      export { A };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-a70f94636f097aad9060cb4e2fc73daf.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      //#region src/client.js
      /** blah */
      const A = "something";
      console.log("client");
      //#endregion
      exports.A = A;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/client.js
      var client_exports = /* @__PURE__ */ __exportAll({});
      __reExport(client_exports, require("./client-some-hash.cjs.js"));
      //#endregion
      Object.defineProperty(exports, "A", {
      	enumerable: true,
      	get: function() {
      		return client_exports.A;
      	}
      });

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/client.js
      var client_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client from "./client-some-hash.esm.js";
      __reExport(client_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___client);
      //#endregion
      var A = client_exports.A;
      export { A };
    `);
});

test("use server", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
    }),
    "src/index.js": js`
      export { doSomething } from "./server";
    `,
    "src/server.js": js`
      "use server";
      export function doSomething() {}
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"], stripHashes("server")))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/server.js
      var server_exports = /* @__PURE__ */ __exportAll({});
      __reExport(server_exports, require("./server-some-hash.cjs.js"));
      //#endregion
      Object.defineProperty(exports, "doSomething", {
      	enumerable: true,
      	get: function() {
      		return server_exports.doSomething;
      	}
      });

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      //#region \\0rolldown/runtime.js
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __exportAll = (all, no_symbols) => {
      	let target = {};
      	for (var name in all) __defProp(target, name, {
      		get: all[name],
      		enumerable: true
      	});
      	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
      	return target;
      };
      var __copyProps = (to, from, except, desc) => {
      	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
      		key = keys[i];
      		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      			get: ((k) => from[k]).bind(null, key),
      			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      		});
      	}
      	return to;
      };
      var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
      //#endregion
      //#region \\0preserve boundary:0src/server.js
      var server_exports = /* @__PURE__ */ __exportAll({});
      import * as import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___server from "./server-some-hash.esm.js";
      __reExport(server_exports, import___USE_CLIENT_IMPORT__VRAku6fjghkApIISiBWPzg__USE_CLIENT_IMPORT___server);
      //#endregion
      var doSomething = server_exports.doSomething;
      export { doSomething };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/server-this-is-not-the-real-hash-1514b4880a1eea3958d5a6a65519ad77.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use server";
      //#region src/server.js
      function doSomething() {}
      //#endregion
      export { doSomething };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/server-this-is-not-the-real-hash-1a680e81f5ab07c990d8db40c29b816e.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use server";
      //#region src/server.js
      function doSomething() {}
      //#endregion
      exports.doSomething = doSomething;
    `);
});
