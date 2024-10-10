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
  stripHashes,
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

    exports["default"] = thing$1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    let thing = "wow";
    {
      thing = "something";
    }
    {
      thing += "other";
    }
    var thing$1 = thing;

    export { thing$1 as default };

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

    exports["default"] = thing$1;

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

    export { thing$1 as default };

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
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

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
    					get: function () { return e[k]; }
    				});
    			}
    		});
    	}
    	n["default"] = e;
    	return Object.freeze(n);
    }

    var path__namespace = /*#__PURE__*/_interopNamespace(path);

    let obj = {};

    let thing = "something";

    exports.path = path__namespace;
    exports["default"] = thing;
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

    export { thing as default, obj };

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
      `"🎁 [36mpackage-resolvable-but-not-in-deps[39m "react" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies"`
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
      `"🎁 [36m@imports-outside-pkg-dir/pkg-a[39m all relative imports in a package should only import modules inside of their package directory but "src/index.js" is importing "../../some-file""`
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
    [Error: 🎁 [36m@errors/package-one[39m "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 [36m@errors/package-one[39m "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 [36m@errors/package-two[39m "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁 [36m@errors/package-two[39m "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies]
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

    exports["default"] = compute;

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
    	get: function () { return withTopLevelThisInEsm__default["default"]; }
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg.cjs.prod.js");
    } else {
      module.exports = require("./pkg.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    !function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).pkg=t()}(this,(function(){"use strict";var e=function(){return e=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},e.apply(this,arguments)};return e({},{bar:42})}));
    //# sourceMappingURL=pkg.umd.min.js.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg.umd.min.js","sources":["../node_modules/with-top-level-this-in-esm/index.js"],"sourcesContent":["// output transpiled by TS with inlined tslib helper\\nvar __assign =\\n  (this && this.__assign) ||\\n  function () {\\n    __assign =\\n      Object.assign ||\\n      function (t) {\\n        for (var s, i = 1, n = arguments.length; i < n; i++) {\\n          s = arguments[i];\\n          for (var p in s)\\n            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];\\n        }\\n        return t;\\n      };\\n    return __assign.apply(this, arguments);\\n  };\\nvar foo = { bar: 42 };\\nexport default __assign({}, foo);"],"names":["__assign","Object","assign","t","s","i","n","arguments","length","p","prototype","hasOwnProperty","call","apply","this","bar"],"mappings":"oOACA,IAAIA,EAEF,WAWE,OAVAA,EACEC,OAAOC,QACP,SAAUC,GACR,IAAK,IAAIC,EAAGC,EAAI,EAAGC,EAAIC,UAAUC,OAAQH,EAAIC,EAAGD,IAE9C,IAAK,IAAII,KADTL,EAAIG,UAAUF,GAERJ,OAAOS,UAAUC,eAAeC,KAAKR,EAAGK,KAAIN,EAAEM,GAAKL,EAAEK,IAE7D,OAAON,CACf,EACWH,EAASa,MAAMC,KAAMP,UAChC,SAEeP,EAAS,CAAE,EADhB,CAAEe,IAAK"}
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
      "🎁 [36mpkg[39m "src/index.js" used \`this\` keyword at the top level of an ES module. You can read more about this at https://rollupjs.org/guide/en/#error-this-is-undefined and fix this issue that has happened here:
      🎁 [36mpkg[39m
      🎁 [36mpkg[39m 1: export default this;
      🎁 [36mpkg[39m                   ^
      🎁 [36mpkg[39m"
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
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi9kZWNsYXJhdGlvbnMvc3JjL2luZGV4LmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-309cc5e233da5126cc473e58b428ae77.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./client-some-hash.cjs.prod.js");
    } else {
      module.exports = require("./client-some-hash.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-a11d1f492d9543facacf36a90317cec3.cjs.dev.js, dist/client-this-is-not-the-real-hash-a11d1f492d9543facacf36a90317cec3.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const A = "something";
    console.log("client");

    exports.A = A;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-fd8b1fd76b9a9f92e7a34756ea9de1bb.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    const A = "something";
    console.log("client");

    export { A };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var client = require('./client-some-hash.cjs.dev.js');



    Object.defineProperty(exports, 'A', {
    	enumerable: true,
    	get: function () { return client.A; }
    });

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

    var client = require('./client-some-hash.cjs.prod.js');



    Object.defineProperty(exports, 'A', {
    	enumerable: true,
    	get: function () { return client.A; }
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { A } from './client-some-hash.esm.js';

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-309cc5e233da5126cc473e58b428ae77.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./client-some-hash.cjs.prod.js");
    } else {
      module.exports = require("./client-some-hash.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-58cd7e7ea387bdad7ade6e69ad459a33.cjs.dev.js, dist/client-this-is-not-the-real-hash-58cd7e7ea387bdad7ade6e69ad459a33.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const A = "something";

    exports.A = A;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-b139dd137c1582a38e35a32f7605ab74.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    const A = "something";

    export { A };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/d-this-is-not-the-real-hash-24ae31ff9082854e1c87c472a0860694.cjs.dev.js, dist/d-this-is-not-the-real-hash-24ae31ff9082854e1c87c472a0860694.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const D = "d";

    exports.D = D;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/d-this-is-not-the-real-hash-edd08facffb57479ea67330357004b7f.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    const D = "d";

    export { D };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/d-this-is-not-the-real-hash-fe4bc2a46f636c80b94c4fc4d054f67e.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./d-some-hash.cjs.prod.js");
    } else {
      module.exports = require("./d-some-hash.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var client = require('./client-some-hash.cjs.dev.js');
    var d = require('./d-some-hash.cjs.dev.js');

    function C() {
      return d.D;
    }

    const B = "b";

    Object.defineProperty(exports, 'A', {
      enumerable: true,
      get: function () { return client.A; }
    });
    exports.B = B;
    exports.C = C;

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

    var client = require('./client-some-hash.cjs.prod.js');
    var d = require('./d-some-hash.cjs.prod.js');

    function C() {
      return d.D;
    }

    const B = "b";

    Object.defineProperty(exports, 'A', {
      enumerable: true,
      get: function () { return client.A; }
    });
    exports.B = B;
    exports.C = C;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { A } from './client-some-hash.esm.js';
    import { D } from './d-some-hash.esm.js';

    function C() {
      return D;
    }

    const B = "b";

    export { B, C };

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js, dist/pkg.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const a = true;

    exports.a = a;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg.cjs.prod.js");
    } else {
      module.exports = require("./pkg.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    const a = true;

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a-this-is-not-the-real-hash-31df1da61df583d4d0394e050f45c88f.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./a-some-hash.cjs.prod.js");
    } else {
      module.exports = require("./a-some-hash.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a-this-is-not-the-real-hash-d912e49410d7ef28505c151217271ac8.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    const A = 1;

    export { A };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a-this-is-not-the-real-hash-f67b4ee51aa01653fbab25fa1bdfb30e.cjs.dev.js, dist/a-this-is-not-the-real-hash-f67b4ee51aa01653fbab25fa1bdfb30e.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const A = 1;

    exports.A = A;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/a.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const A = 1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/b.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const B = 2;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { A } from "./a.js";
    export { B } from "./b.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var a = require('./a-some-hash.cjs.dev.js');

    const B = 2;

    Object.defineProperty(exports, 'A', {
    	enumerable: true,
    	get: function () { return a.A; }
    });
    exports.B = B;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./typescript.cjs.prod.js");
    } else {
      module.exports = require("./typescript.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var a = require('./a-some-hash.cjs.prod.js');

    const B = 2;

    Object.defineProperty(exports, 'A', {
    	enumerable: true,
    	get: function () { return a.A; }
    });
    exports.B = B;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { A } from './a-some-hash.esm.js';

    const B = 2;

    export { B };

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
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC1hbm90aGVyLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vZGlzdC9kZWNsYXJhdGlvbnMvc3JjL2Fub3RoZXIuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ another/dist/typescript-another.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import { A } from '../../dist/typescript.esm.js';

    function something() {
      console.log(A);
    }

    export { something };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/another.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare function something(): void;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const A = 1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    const A = 1;

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-2d9a93e2d378420c96993764a8d2b439.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    import 'client-only';

    const a = 1;
    const b = 1;

    export { a, b };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import * as client from './client-some-hash.esm.js';
    export { client as x };

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
    import { client } from './ui-some-hash.esm.js';

    function another() {
      return c;
    }

    async function thing() {
      return a;
    }
    function other() {
      console.log(another, client);
    }

    export { other, thing };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/ui-this-is-not-the-real-hash-bed1afce5b6c65dfe85deec7c0ef27d1.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    import 'client-only';

    function client() {
      console.log("a");
    }

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
    export { client } from './ui-some-hash.esm.js';

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/ui-this-is-not-the-real-hash-caf79d0376c465220743255e5be1da2d.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    import 'client-only';
    import * as self from './ui-some-hash.esm.js';

    function client() {
      console.log("a", self);
    }

    export { client };

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
    'use client';
    import 'client-only';
    import * as self from './pkg.esm.js';

    function client() {
      console.log("a", self);
    }

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-309cc5e233da5126cc473e58b428ae77.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./client-some-hash.cjs.prod.js");
    } else {
      module.exports = require("./client-some-hash.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-d42256f03593be08d8620d4b6456d377.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    /** blah */

    const A = "something";
    console.log("client");

    export { A };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/client-this-is-not-the-real-hash-ef1aedc2ed504d143f108943a7d13c16.cjs.dev.js, dist/client-this-is-not-the-real-hash-ef1aedc2ed504d143f108943a7d13c16.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use client';
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    /** blah */

    const A = "something";
    console.log("client");

    exports.A = A;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var client = require('./client-some-hash.cjs.dev.js');



    Object.defineProperty(exports, 'A', {
    	enumerable: true,
    	get: function () { return client.A; }
    });

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

    var client = require('./client-some-hash.cjs.prod.js');



    Object.defineProperty(exports, 'A', {
    	enumerable: true,
    	get: function () { return client.A; }
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { A } from './client-some-hash.esm.js';

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var server = require('./server-some-hash.cjs.dev.js');



    Object.defineProperty(exports, 'doSomething', {
    	enumerable: true,
    	get: function () { return server.doSomething; }
    });

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

    var server = require('./server-some-hash.cjs.prod.js');



    Object.defineProperty(exports, 'doSomething', {
    	enumerable: true,
    	get: function () { return server.doSomething; }
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { doSomething } from './server-some-hash.esm.js';

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/server-this-is-not-the-real-hash-288a9f5076a34272a0270a4055aa266d.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use server';
    function doSomething() {}

    export { doSomething };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/server-this-is-not-the-real-hash-4c6b8ec0a8b072aff1b26a3ac24de144.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./server-some-hash.cjs.prod.js");
    } else {
      module.exports = require("./server-some-hash.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/server-this-is-not-the-real-hash-f9ea3f80de7afbb1e4ac2175565ef521.cjs.dev.js, dist/server-this-is-not-the-real-hash-f9ea3f80de7afbb1e4ac2175565ef521.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use server';
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function doSomething() {}

    exports.doSomething = doSomething;

  `);
});
