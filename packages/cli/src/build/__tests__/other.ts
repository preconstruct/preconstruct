import build from "../";
import {
  snapshotDirectory,
  install,
  testdir,
  js,
  getDist,
  basicPkgJson,
  ts,
  repoNodeModules,
  typescriptFixture,
  getFiles,
} from "../../../test-utils";
import { doPromptInput } from "../../prompt";

jest.mock("../../prompt");

jest.setTimeout(30000);

afterEach(() => {
  jest.resetAllMocks();
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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.browser.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let thing = "wow";
    {
      thing = "something";
    }
    {
      thing += "other";
    }
    var thing$1 = thing;

    exports.default = thing$1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    let thing = "wow";
    {
      thing = "something";
    }
    {
      thing += "other";
    }
    var thing$1 = thing;

    export default thing$1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.cjs.dev.js, dist/browser.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let thing = "wow";
    if (typeof window !== "undefined") {
      thing = "something";
    }
    if (typeof document !== undefined) {
      thing += "other";
    }
    var thing$1 = thing;

    exports.default = thing$1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./browser.cjs.prod.js");
    } else {
      module.exports = require("./browser.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    let thing = "wow";
    if (typeof window !== "undefined") {
      thing = "something";
    }
    if (typeof document !== undefined) {
      thing += "other";
    }
    var thing$1 = thing;

    export default thing$1;

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
    export declare type SomeType = string;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import { SomeType } from "./another-thing";
    export * from "./one-more-thing";
    import * as path from "path";
    export { path };
    declare let thing: SomeType;
    export default thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/one-more-thing.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    declare var obj: object;

    export { obj };
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    export { default } from "./declarations/src/index";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.dev.js, dist/typescript.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var path = require('path');

    function _interopNamespace(e) {
    	if (e && e.__esModule) return e;
    	var n = Object.create(null);
    	if (e) {
    		Object.keys(e).forEach(function (k) {
    			if (k !== 'default') {
    				var d = Object.getOwnPropertyDescriptor(e, k);
    				Object.defineProperty(n, k, d.get ? d : {
    					enumerable: true,
    					get: function () {
    						return e[k];
    					}
    				});
    			}
    		});
    	}
    	n['default'] = e;
    	return Object.freeze(n);
    }

    var path__namespace = /*#__PURE__*/_interopNamespace(path);

    let obj = {};

    let thing = "something";

    exports.path = path__namespace;
    exports.default = thing;
    exports.obj = obj;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./typescript.cjs.prod.js");
    } else {
      module.exports = require("./typescript.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import * as path from 'path';
    export { path };

    let obj = {};

    let thing = "something";

    export default thing;
    export { obj };

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
      `"🎁 package-resolvable-but-not-in-deps "react" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies"`
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
    !function(e,o){"object"==typeof exports&&"undefined"!=typeof module?module.exports=o():"function"==typeof define&&define.amd?define(o):(e="undefined"!=typeof globalThis?globalThis:e||self).packageExportsResolvableButNotInDeps=o()}(this,(function(){"use strict";return function(e){return function(e){console.log(e)}(e)}}));
    //# sourceMappingURL=package-exports-resolvable-but-not-in-deps.umd.min.js.map

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
      `"🎁 @imports-outside-pkg-dir/pkg-a all relative imports in a package should only import modules inside of their package directory but "src/index.js" is importing "../../some-file""`
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

  (doPromptInput as jest.MockedFunction<
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
    [Error: 🎁 @errors/package-one "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 @errors/package-one "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 @errors/package-two "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 @errors/package-two "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies]
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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js, dist/pkg.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function compute(arg) {
      return eval(arg);
    }

    exports.default = compute;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg.cjs.prod.js");
    } else {
      module.exports = require("./pkg.cjs.dev.js");
    }

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js, dist/pkg.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var withTopLevelThisInEsm = require('with-top-level-this-in-esm');

    function _interopDefault (e) { return e && e.__esModule ? e : { 'default': e }; }

    var withTopLevelThisInEsm__default = /*#__PURE__*/_interopDefault(withTopLevelThisInEsm);



    Object.defineProperty(exports, 'default', {
    	enumerable: true,
    	get: function () {
    		return withTopLevelThisInEsm__default['default'];
    	}
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg.cjs.prod.js");
    } else {
      module.exports = require("./pkg.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    !function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).pkg=t()}(this,(function(){"use strict";var e=function(){return(e=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e}).apply(this,arguments)};return e({},{bar:42})}));
    //# sourceMappingURL=pkg.umd.min.js.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg.umd.min.js","sources":["../node_modules/with-top-level-this-in-esm/index.js"],"sourcesContent":["// output transpiled by TS with inlined tslib helper\\nvar __assign =\\n  (this && this.__assign) ||\\n  function () {\\n    __assign =\\n      Object.assign ||\\n      function (t) {\\n        for (var s, i = 1, n = arguments.length; i < n; i++) {\\n          s = arguments[i];\\n          for (var p in s)\\n            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];\\n        }\\n        return t;\\n      };\\n    return __assign.apply(this, arguments);\\n  };\\nvar foo = { bar: 42 };\\nexport default __assign({}, foo);"],"names":["__assign","Object","assign","t","s","i","n","arguments","length","p","prototype","hasOwnProperty","call","apply","this","bar"],"mappings":"oOACA,IAAIA,EAEF,WAWE,OAVAA,EACEC,OAAOC,QACP,SAAUC,GACR,IAAK,IAAIC,EAAGC,EAAI,EAAGC,EAAIC,UAAUC,OAAQH,EAAIC,EAAGD,IAE9C,IAAK,IAAII,KADTL,EAAIG,UAAUF,GAERJ,OAAOS,UAAUC,eAAeC,KAAKR,EAAGK,KAAIN,EAAEM,GAAKL,EAAEK,IAE7D,OAAON,IAEKU,MAAMC,KAAMP,mBAGjBP,EAAS,GADd,CAAEe,IAAK"}
  `);
});

test("fails for source files containing top-level this", async () => {
  let dir = await testdir({
    "package.json": basicPkgJson(),
    "src/index.js": js`
                      export default this;
                    `,
  });

  try {
    await build(dir);
  } catch (err) {
    expect(err.message).toMatchInlineSnapshot(`
      "🎁 pkg "src/index.js" used \`this\` keyword at the top level of an ES module. You can read more about this at https://rollupjs.org/guide/en/#error-this-is-undefined and fix this issue that has happened here:
      🎁 pkg
      🎁 pkg 1: export default this;
      🎁 pkg                   ^
      🎁 pkg"
    `);
    return;
  }
  expect(true).toBe(false);
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
    export * from "./declarations/src/index";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js, dist/pkg.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const x = "hello";

    exports.x = x;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg.cjs.prod.js");
    } else {
      module.exports = require("./pkg.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const x = "hello";

    export { x };

  `);
});

test("server components", async () => {
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
  let originalProcessCwd = process.cwd;
  try {
    process.cwd = () => dir;
    await build(dir);
    expect(await getFiles(dir, ["dist/**"])).toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-20a7a0ce.cjs.dev.js, dist/client-d0bc5238.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      'use strict';

      Object.defineProperty(exports, '__esModule', { value: true });

      const A = "something";

      exports.A = A;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-9868ff2a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      "use client";
      const A = "something";

      export { A };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-d0bc5238.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      'use strict';

      if (process.env.NODE_ENV === "production") {
        module.exports = require("./client-d0bc5238.cjs.prod.js");
      } else {
        module.exports = require("./client-d0bc5238.cjs.dev.js");
      }

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      'use strict';

      Object.defineProperty(exports, '__esModule', { value: true });

      var client = require('./client-20a7a0ce.cjs.dev.js');



      exports.A = client.A;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      'use strict';

      if (process.env.NODE_ENV === "production") {
        module.exports = require("./pkg.cjs.prod.js");
      } else {
        module.exports = require("./pkg.cjs.dev.js");
      }

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      'use strict';

      Object.defineProperty(exports, '__esModule', { value: true });

      var client = require('./client-d0bc5238.cjs.prod.js');



      exports.A = client.A;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { A } from './client-9868ff2a.esm.js';

    `);
  } finally {
    process.cwd = originalProcessCwd;
  }
});
