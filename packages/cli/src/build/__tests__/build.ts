import build from "../";
import fixturez from "fixturez";
import path from "path";
import fs from "fs-extra";
import {
  initBasic,
  getPkg,
  snapshotDistFiles,
  install,
  testdir,
  js,
  getDist,
  repoNodeModules,
  basicPkgJson,
  getFiles,
  ts,
} from "../../../test-utils";
import { doPromptInput as _doPromptInput } from "../../prompt";
import { confirms as _confirms } from "../../messages";
import spawn from "spawndamnit";
import stripAnsi from "strip-ansi";

const f = fixturez(__dirname);

jest.mock("../../prompt");

let doPromptInput = _doPromptInput as jest.MockedFunction<
  typeof _doPromptInput
>;

let unsafeRequire = require;

test("monorepo", async () => {
  let tmpPath = f.copy("monorepo");
  await initBasic(tmpPath);
  await install(tmpPath);
  await build(tmpPath);
  let counter = 1;
  for (let pkg of ["package-one", "package-two"]) {
    let pkgPath = path.join(tmpPath, "packages", pkg);
    await snapshotDistFiles(pkgPath);

    expect(unsafeRequire(pkgPath).default).toBe(counter++);
  }
});

test("no module", async () => {
  let tmpPath = f.copy("no-module");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);

  expect(unsafeRequire(tmpPath).default).toBe(
    "this does not have a module build"
  );
});

test("clears dist folder", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "already-has-things-in-dist",
      main: "dist/already-has-things-in-dist.cjs.js",
    }),
    "src/index.js": js`
      export default "something";
    `,
    "dist/something.js": js`
      throw new Error("why are you seeing this?");
    `,
  });

  await build(dir);

  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/already-has-things-in-dist.cjs.dev.js, dist/already-has-things-in-dist.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var index = "something";

    exports["default"] = index;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/already-has-things-in-dist.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./already-has-things-in-dist.cjs.prod.js");
    } else {
      module.exports = require("./already-has-things-in-dist.cjs.dev.js");
    }

  `);
});

test("flow", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "flow",
      main: "dist/flow.cjs.js",
      module: "dist/flow.esm.js",
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-flow")],
    }),

    "src/a.js": js`
      export default "wow";
    `,

    "src/index.js": js`
      // @flow

      export function doSomething(arg: string): string {
        return "something" + arg;
      }

      export { default as something } from "./a";
    `,
  });

  await install(tmpPath);

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("flow", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "flow-export-default",
      main: "dist/flow-export-default.cjs.js",
      module: "dist/flow-export-default.esm.js",
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-flow")],
    }),
    "src/index.js": js`
      // @flow

      export function doSomething(arg: string): string {
        return "something" + arg;
      }

      export default "wow";
    `,
  });

  await install(tmpPath);

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("prod checks", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "prod-checks",
      main: "dist/prod-checks.cjs.js",
      license: "MIT",
      private: true,
    }),

    "src/index.js": js`
      export function thing() {
        if (process.env.NODE_ENV !== "production") {
          return "not prod";
        }
        return "prod";
      }
    `,
  });

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

// TODO: make it faster so this isn't required
jest.setTimeout(20000);

test("umd with dep on other module", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "umd-with-dep",
      main: "dist/umd-with-dep.cjs.js",
      "umd:main": "dist/umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "umdWithDep",
      },

      peerDependencies: {
        react: "^16.6.3",
      },

      devDependencies: {
        react: "^16.6.3",
      },
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "src/index.js": js`
      import { createElement } from "react";

      createElement("div", null);
    `,
  });

  doPromptInput.mockImplementation(async (question) => {
    if (question === `What should the umdName of react be?`) {
      return "React";
    }
    throw new Error("unexpected question: " + question);
  });

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    {
      "devDependencies": {
        "react": "^16.6.3",
      },
      "main": "dist/umd-with-dep.cjs.js",
      "name": "umd-with-dep",
      "peerDependencies": {
        "react": "^16.6.3",
      },
      "preconstruct": {
        "globals": {
          "react": "React",
        },
        "umdName": "umdWithDep",
      },
      "umd:main": "dist/umd-with-dep.umd.min.js",
    }
  `);
});

test("monorepo umd with dep on other module", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-umd-with-dep",
      main: "index.js",
      workspaces: ["packages/*"],

      preconstruct: {
        packages: ["packages/*"],

        globals: {
          react: "React",
        },
      },
    }),
    "node_modules/@some-scope/package-one-umd-with-dep": {
      kind: "symlink",
      path: "packages/package-one",
    },
    "packages/package-four/package.json": JSON.stringify({
      name: "@some-scope/package-four-umd-with-dep",
      main: "dist/some-scope-package-four-umd-with-dep.cjs.js",
      "umd:main": "dist/some-scope-package-four-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageFour",
      },

      dependencies: {
        "@some-scope/package-one-umd-with-dep": "1.0.0",
      },

      peerDependencies: {
        react: "^16.6.3",
      },
    }),

    "packages/package-one/package.json": JSON.stringify({
      name: "@some-scope/package-one-umd-with-dep",
      main: "dist/some-scope-package-one-umd-with-dep.cjs.js",
      "umd:main": "dist/some-scope-package-one-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageOne",
      },

      peerDependencies: {
        react: "^16.6.3",
      },

      devDependencies: {
        react: "^16.6.3",
      },
    }),

    "packages/package-three/package.json": JSON.stringify({
      name: "@some-scope/package-three-umd-with-dep",
      main: "dist/some-scope-package-three-umd-with-dep.cjs.js",
      "umd:main": "dist/some-scope-package-three-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageThree",
      },

      peerDependencies: {
        "@some-scope/package-one-umd-with-dep": "1.0.0",
      },

      devDependencies: {
        "@some-scope/package-one-umd-with-dep": "1.0.0",
      },
    }),

    "packages/package-two/package.json": JSON.stringify({
      name: "@some-scope/package-two-umd-with-dep",
      main: "dist/some-scope-package-two-umd-with-dep.cjs.js",
      "umd:main": "dist/some-scope-package-two-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageTwo",
      },

      peerDependencies: {
        react: "^16.6.3",
      },

      devDependencies: {
        react: "^16.6.3",
      },
    }),

    "packages/package-four/src/index.js": js`
      import "@some-scope/package-one-umd-with-dep";
    `,

    "packages/package-one/src/index.js": js`
      import { createElement } from "react";

      createElement("div", null);
    `,

    "packages/package-three/src/index.js": js`
      import "@some-scope/package-one-umd-with-dep";
    `,

    "packages/package-two/src/index.js": js`
      import { createElement } from "react";

      createElement("h1", null);
    `,
  });
  let asked = false;
  doPromptInput.mockImplementation(async (question) => {
    if (asked) {
      throw new Error("only one prompt should happen: " + question);
    }
    if (question === `What should the umdName of react be?`) {
      asked = true;
      return "React";
    }
    throw new Error("unexpected question: " + question);
  });
  await build(tmpPath);

  await snapshotDistFiles(path.join(tmpPath, "packages", "package-one"));
  await snapshotDistFiles(path.join(tmpPath, "packages", "package-two"));
  await snapshotDistFiles(path.join(tmpPath, "packages", "package-three"));
  await snapshotDistFiles(path.join(tmpPath, "packages", "package-four"));

  expect(await getPkg(path.join(tmpPath, "packages", "package-one")))
    .toMatchInlineSnapshot(`
    {
      "devDependencies": {
        "react": "^16.6.3",
      },
      "main": "dist/some-scope-package-one-umd-with-dep.cjs.js",
      "name": "@some-scope/package-one-umd-with-dep",
      "peerDependencies": {
        "react": "^16.6.3",
      },
      "preconstruct": {
        "umdName": "packageOne",
      },
      "umd:main": "dist/some-scope-package-one-umd-with-dep.umd.min.js",
    }
  `);

  expect(await getPkg(path.join(tmpPath, "packages", "package-two")))
    .toMatchInlineSnapshot(`
    {
      "devDependencies": {
        "react": "^16.6.3",
      },
      "main": "dist/some-scope-package-two-umd-with-dep.cjs.js",
      "name": "@some-scope/package-two-umd-with-dep",
      "peerDependencies": {
        "react": "^16.6.3",
      },
      "preconstruct": {
        "umdName": "packageTwo",
      },
      "umd:main": "dist/some-scope-package-two-umd-with-dep.umd.min.js",
    }
  `);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    {
      "main": "index.js",
      "name": "monorepo-umd-with-dep",
      "preconstruct": {
        "globals": {
          "react": "React",
        },
        "packages": [
          "packages/*",
        ],
      },
      "workspaces": [
        "packages/*",
      ],
    }
  `);
});

test("monorepo single package", async () => {
  let tmpPath = f.copy("monorepo-single-package");
  await initBasic(tmpPath);
  await install(tmpPath);

  await build(tmpPath);
  let pkgPath = path.join(tmpPath, "packages", "package-two");
  await snapshotDistFiles(pkgPath);

  expect(unsafeRequire(pkgPath).default).toBe(2);
});

test("json", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "json-package",
      main: "dist/json-package.cjs.js",
      module: "dist/json-package.esm.js",
    }),

    "src/index.js": js`
      import changesetsSchema from "./schema.json";

      export let schema = changesetsSchema;
    `,

    "src/schema.json": JSON.stringify({
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {},
      required: ["$schema"],
    }),
  });

  await build(tmpPath);

  expect(await getDist(tmpPath)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/json-package.cjs.dev.js, dist/json-package.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var changesetsSchema = {
    	$schema: "http://json-schema.org/draft-07/schema#",
    	type: "object",
    	properties: {
    	},
    	required: [
    		"$schema"
    	]
    };

    let schema = changesetsSchema;

    exports.schema = schema;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/json-package.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./json-package.cjs.prod.js");
    } else {
      module.exports = require("./json-package.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/json-package.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    var changesetsSchema = {
    	$schema: "http://json-schema.org/draft-07/schema#",
    	type: "object",
    	properties: {
    	},
    	required: [
    		"$schema"
    	]
    };

    let schema = changesetsSchema;

    export { schema };

  `);
});

test("respect browser alias field in dependencies when bundling UMD", async () => {
  let dir = await testdir({
    "package.json": basicPkgJson({
      umdName: "importingPkgWithBrowserAliasField",
      dependencies: {
        "with-browser-alias-field": "*",
      },
    }),
    "src/index.js": js`
      import target from "with-browser-alias-field";

      export default "And the target is: " + target;
    `,
    "node_modules/with-browser-alias-field/package.json": JSON.stringify({
      name: "with-browser-alias-field",
      browser: {
        "./lib/file.js": "./lib/browser-file.js",
      },
    }),
    "node_modules/with-browser-alias-field/index.js": js`
      export { default } from "./lib/file";
    `,
    "node_modules/with-browser-alias-field/lib/file.js": js`
      export default "node";
    `,
    "node_modules/with-browser-alias-field/lib/browser-file.js": js`
      export default "browser";
    `,
  });

  await build(dir);

  expect(await getFiles(dir, ["dist/*umd*"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    !function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).importingPkgWithBrowserAliasField=t()}(this,(function(){"use strict";return"And the target is: browser"}));
    //# sourceMappingURL=pkg.umd.min.js.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.umd.min.js.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg.umd.min.js","sources":["../src/index.js"],"sourcesContent":["import target from \\"with-browser-alias-field\\";\\n\\nexport default \\"And the target is: \\" + target;"],"names":[],"mappings":"wQAEe"}
  `);
});

test("keepDynamicImportAsDynamicImportInCommonJS experimental flag", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      dependencies: {
        "some-dep": "*",
      },
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          keepDynamicImportAsDynamicImportInCommonJS: true,
        },
      },
    }),
    "src/index.js": js`
      import "some-dep";

      import("some-dep");
    `,
  });

  await build(dir);

  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    require('some-dep');

    import('some-dep');

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

  `);
});

test("using @babel/plugin-transform-runtime with useESModules: true", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      module: "dist/test.esm.js",
      dependencies: {
        "@babel/runtime": "*",
      },
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          keepDynamicImportAsDynamicImportInCommonJS: true,
        },
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
      plugins: [
        [
          require.resolve("@babel/plugin-transform-runtime"),
          { useESModules: true },
        ],
      ],
    }),
    "src/index.js": js`
      export class Thing {}
    `,
  });

  await build(dir);

  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var _createClass = require('@babel/runtime/helpers/createClass');
    var _classCallCheck = require('@babel/runtime/helpers/classCallCheck');

    var Thing = /*#__PURE__*/_createClass(function Thing() {
      _classCallCheck(this, Thing);
    });

    exports.Thing = Thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import _createClass from '@babel/runtime/helpers/esm/createClass';
    import _classCallCheck from '@babel/runtime/helpers/esm/classCallCheck';

    var Thing = /*#__PURE__*/_createClass(function Thing() {
      _classCallCheck(this, Thing);
    });

    export { Thing };

  `);
});

test("worker and browser build", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@exports/test",
      main: "dist/exports-test.cjs.js",
      module: "dist/exports-test.esm.js",
      browser: {
        "./dist/exports-test.esm.js": "./dist/exports-test.browser.esm.js",
      },
      exports: {
        ".": {
          module: {
            worker: "./dist/exports-test.worker.esm.js",
            browser: "./dist/exports-test.browser.esm.js",
            default: "./dist/exports-test.esm.js",
          },
          default: "./dist/exports-test.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: {
          envConditions: ["browser", "worker"],
        },
      },
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "src/index.js": js`
      export const thing = typeof window;
    `,
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/exports-test.browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = "object";

    export { thing };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/exports-test.cjs.dev.js, dist/exports-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const thing = typeof window;

    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/exports-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./exports-test.cjs.prod.js");
    } else {
      module.exports = require("./exports-test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/exports-test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = typeof window;

    export { thing };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/exports-test.worker.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = "undefined";

    export { thing };

  `);
});

const tsSetupFiles = {
  "node_modules/typescript": {
    kind: "symlink",
    path: path.join(repoNodeModules, "typescript"),
  },
  "node_modules/@babel/preset-typescript": {
    kind: "symlink",
    path: path.join(repoNodeModules, "@babel/preset-typescript"),
  },
  "babel.config.json": JSON.stringify({
    presets: ["@babel/preset-typescript"],
  }),
  "tsconfig.json": JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "nodenext",
      strict: true,
      declaration: true,
    },
  }),
} as const;

const tscBinPath = path.join(
  path.dirname(require.resolve("typescript/package.json")),
  "bin/tsc"
);

test("typescript with nodenext module resolution", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@exports/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          default: "./dist/pkg-a.cjs.js",
        },
        "./something": {
          module: "./something/dist/pkg-a-something.esm.js",
          default: "./something/dist/pkg-a-something.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts", "something.ts"],
        exports: true,
      },
    }),
    "packages/pkg-a/something/package.json": JSON.stringify({
      main: "dist/pkg-a-something.cjs.js",
      module: "dist/pkg-a-something.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "index";
    `,
    "packages/pkg-a/src/something.ts": ts`
      export const something = "something";
    `,
    "packages/pkg-a/not-exported.ts": ts`
      export const notExported = true;
    `,
    "blah.ts": ts`
      import { thing } from "pkg-a";
      import { something } from "pkg-a/something";
      import { notExported } from "pkg-a/not-exported"; // should error

      function acceptThing<T>(x: T) {}

      acceptThing<"index">(thing);
      acceptThing<"something">(something);

      // this is to check that TypeScript is actually checking things
      acceptThing<"other">(thing); // should error
      acceptThing<"other">(something); // should error
    `,
    ...tsSetupFiles,
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await build(dir);
  let { code, stdout, stderr } = await spawn(tscBinPath, [], { cwd: dir });
  expect(code).toBe(2);
  expect(stdout.toString("utf8")).toMatchInlineSnapshot(`
    "blah.ts(3,29): error TS2307: Cannot find module 'pkg-a/not-exported' or its corresponding type declarations.
    blah.ts(11,22): error TS2345: Argument of type '"index"' is not assignable to parameter of type '"other"'.
    blah.ts(12,22): error TS2345: Argument of type '"something"' is not assignable to parameter of type '"other"'.
    "
  `);
  expect(stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
});

test("self import", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@my-test/package",
      main: "dist/my-test-package.cjs.js",
      module: "dist/my-test-package.esm.js",
      preconstruct: {
        entrypoints: ["index.js", "other.js"],
      },
    }),
    "other/package.json": JSON.stringify({
      main: "dist/my-test-package-other.cjs.js",
      module: "dist/my-test-package-other.esm.js",
    }),
    "src/index.js": js`
      export const a = 1;
    `,
    "src/other.js": js`
      export { a } from "@my-test/package";
      export const b = a;
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**", "other/dist/**"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/my-test-package.cjs.dev.js, dist/my-test-package.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const a = 1;

    exports.a = a;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/my-test-package.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./my-test-package.cjs.prod.js");
    } else {
      module.exports = require("./my-test-package.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/my-test-package.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const a = 1;

    export { a };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ other/dist/my-test-package-other.cjs.dev.js, other/dist/my-test-package-other.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var _package = require('@my-test/package');

    const b = a;

    Object.defineProperty(exports, 'a', {
    	enumerable: true,
    	get: function () { return _package.a; }
    });
    exports.b = b;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ other/dist/my-test-package-other.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./my-test-package-other.cjs.prod.js");
    } else {
      module.exports = require("./my-test-package-other.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ other/dist/my-test-package-other.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { a } from '@my-test/package';

    const b = a;

    export { b };

  `);
});

test("correct default export using mjs and dmts proxies", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@mjs-proxy/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./something": {
          module: "./something/dist/pkg-a-something.esm.js",
          import: "./something/dist/pkg-a-something.cjs.mjs",
          default: "./something/dist/pkg-a-something.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts", "something.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "packages/pkg-a/something/package.json": JSON.stringify({
      main: "dist/pkg-a-something.cjs.js",
      module: "dist/pkg-a-something.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "index";
      export default true;
    `,
    "packages/pkg-a/src/something.ts": ts`
      export const something = "something";
      export default 100;
    `,
    "packages/pkg-a/not-exported.ts": ts`
      export const notExported = true;
      export default "foo";
    `,
    "blah.mts": ts`
      function acceptThing<T>(x: T) {}

      import { thing } from "pkg-a";
      import { something } from "pkg-a/something";
      import { notExported } from "pkg-a/not-exported"; // should error

      acceptThing<"index">(thing);
      acceptThing<"something">(something);

      // this is to check that TypeScript is actually checking things
      acceptThing<"other">(thing); // should error
      acceptThing<"other">(something); // should error

      import indexDefault from "pkg-a";
      import somethingDefault from "pkg-a/something";
      import notExportedDefault from "pkg-a/not-exported"; // should error

      acceptThing<boolean>(indexDefault);
      acceptThing<number>(somethingDefault);

      // this is to check that TypeScript is actually checking things
      acceptThing<"other">(indexDefault); // should error
      acceptThing<"other">(somethingDefault); // should error

      import * as indexNs from "pkg-a";
      import * as somethingNs from "pkg-a/something";
      import * as notExportedNs from "pkg-a/not-exported"; // should error

      acceptThing<boolean>(indexNs.default);
      acceptThing<number>(somethingNs.default);

      // this is to check that TypeScript is actually checking things
      acceptThing<"other">(indexNs.default); // should error
      acceptThing<"other">(somethingNs.default); // should error
    `,
    "runtime-blah.mjs": ts`
      let counter = 0;
      function acceptThing(actual, expected) {
        console.log(++counter, "actual", actual, "expected", expected);
      }

      import { thing } from "pkg-a";
      import { something } from "pkg-a/something";

      acceptThing(thing, "index");
      acceptThing(something, "something");

      import indexDefault from "pkg-a";
      import somethingDefault from "pkg-a/something";

      acceptThing(indexDefault, true);
      acceptThing(somethingDefault, 100);

      import * as indexNs from "pkg-a";
      import * as somethingNs from "pkg-a/something";

      acceptThing(indexNs.default, true);
      acceptThing(somethingNs.default, 100);
    `,
    ...tsSetupFiles,
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const thing = "index";
    declare const _default: true;
    export default _default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/something.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const something = "something";
    declare const _default: 100;
    export default _default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    import ns from "./declarations/src/index.js";
    export default ns.default;
    //# sourceMappingURL=pkg-a.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.mts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    export { default } from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.dev.js, packages/pkg-a/dist/pkg-a.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const thing = "index";
    var index = true;

    exports["default"] = index;
    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg-a.cjs.prod.js");
    } else {
      module.exports = require("./pkg-a.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      thing
    } from "./pkg-a.cjs.js";
    import ns from "./pkg-a.cjs.js";
    export default ns.default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = "index";
    var index = true;

    export { index as default, thing };

  `);

  let tsc = await spawn(
    path.join(
      path.dirname(require.resolve("typescript/package.json")),
      "bin/tsc"
    ),
    [],
    { cwd: dir }
  );
  expect(tsc.code).toBe(2);
  expect(tsc.stdout.toString("utf8")).toMatchInlineSnapshot(`
    "blah.mts(5,29): error TS2307: Cannot find module 'pkg-a/not-exported' or its corresponding type declarations.
    blah.mts(11,22): error TS2345: Argument of type '"index"' is not assignable to parameter of type '"other"'.
    blah.mts(12,22): error TS2345: Argument of type '"something"' is not assignable to parameter of type '"other"'.
    blah.mts(16,32): error TS2307: Cannot find module 'pkg-a/not-exported' or its corresponding type declarations.
    blah.mts(22,22): error TS2345: Argument of type 'true' is not assignable to parameter of type '"other"'.
    blah.mts(23,22): error TS2345: Argument of type '100' is not assignable to parameter of type '"other"'.
    blah.mts(27,32): error TS2307: Cannot find module 'pkg-a/not-exported' or its corresponding type declarations.
    blah.mts(33,22): error TS2345: Argument of type 'true' is not assignable to parameter of type '"other"'.
    blah.mts(34,22): error TS2345: Argument of type '100' is not assignable to parameter of type '"other"'.
    "
  `);
  expect(tsc.stderr.toString("utf8")).toMatchInlineSnapshot(`""`);

  let node = await spawn("node", ["runtime-blah.mjs"], { cwd: dir });

  expect(node.code).toBe(0);
  expect(node.stdout.toString("utf8")).toMatchInlineSnapshot(`
    "1 actual index expected index
    2 actual something expected something
    3 actual true expected true
    4 actual 100 expected 100
    5 actual true expected true
    6 actual 100 expected 100
    "
  `);
  expect(node.stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
});

test("importing a package via dynamic import from another package provides the right types", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@mjs-proxy/repo",
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "index";
      export default true;
    `,
    "packages/pkg-b/package.json": JSON.stringify({
      name: "pkg-b",
      main: "dist/pkg-b.cjs.js",
      module: "dist/pkg-b.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-b.esm.js",
          import: "./dist/pkg-b.cjs.mjs",
          default: "./dist/pkg-b.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
      dependencies: {
        "pkg-a": "^1.0.0",
      },
    }),

    "packages/pkg-b/src/index.ts": ts`
      export const thing = import("pkg-a").then((x) => x.default);
    `,
    ...tsSetupFiles,
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-b"),
    path.join(dir, "node_modules/pkg-b")
  );
  await build(dir);

  expect(await getFiles(dir, ["packages/pkg-b/dist/**"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const thing: Promise<boolean>;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=pkg-b.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-b.cjs.d.mts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=pkg-b.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-b.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.dev.js, packages/pkg-b/dist/pkg-b.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

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

    const thing = Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require('pkg-a')); }).then(x => x.default);

    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg-b.cjs.prod.js");
    } else {
      module.exports = require("./pkg-b.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      thing
    } from "./pkg-b.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = import('pkg-a').then(x => x.default);

    export { thing };

  `);
});

test("importing another package via dynamic import and exporting the namespace produces a typescript error because the type cannot be named", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@mjs-proxy/repo",
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "index";
      export default true;
    `,
    "packages/pkg-b/package.json": JSON.stringify({
      name: "pkg-b",
      main: "dist/pkg-b.cjs.js",
      module: "dist/pkg-b.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-b.esm.js",
          import: "./dist/pkg-b.cjs.mjs",
          default: "./dist/pkg-b.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
      dependencies: {
        "pkg-a": "^1.0.0",
      },
    }),
    "packages/pkg-b/src/index.ts": ts`
      export const thing = import("pkg-a");
    `,
    ...tsSetupFiles,
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-b"),
    path.join(dir, "node_modules/pkg-b")
  );
  const error = await build(dir).catch((x) => x);
  expect(stripAnsi(error + "")).toMatchInlineSnapshot(`
    "Error: 🎁 Generating TypeScript declarations for packages/pkg-b/src/index.ts failed:
    🎁 packages/pkg-b/src/index.ts:1:14 - error TS2841: The type of this expression cannot be named without a 'resolution-mode' assertion, which is an unstable feature. Use nightly TypeScript to silence this error. Try updating with 'npm install -D typescript@next'.
    🎁
    🎁 1 export const thing = import("pkg-a");
    🎁                ~~~~~
    🎁"
  `);
});

test("importing another package via dynamic import and exporting something that requires importing a type from the other package works", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@mjs-proxy/repo",
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export type A = {
        a?: A;
      };
      export const thing: A = {};
      const _default: A = {};
      export default _default;
    `,
    "packages/pkg-b/package.json": JSON.stringify({
      name: "pkg-b",
      main: "dist/pkg-b.cjs.js",
      module: "dist/pkg-b.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-b.esm.js",
          import: "./dist/pkg-b.cjs.mjs",
          default: "./dist/pkg-b.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
      dependencies: {
        "pkg-a": "^1.0.0",
      },
    }),

    "packages/pkg-b/src/index.ts": ts`
      export const pkgADefault = import("pkg-a").then((x) => x.default);
      export const pkgAThing = import("pkg-a").then((x) => x.thing);
    `,
    ...tsSetupFiles,
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-b"),
    path.join(dir, "node_modules/pkg-b")
  );
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.{,m}ts"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare type A = {
        a?: A;
    };
    export declare const thing: A;
    declare const _default: A;
    export default _default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    import ns from "./declarations/src/index.js";
    export default ns.default;
    //# sourceMappingURL=pkg-a.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    export { default } from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const pkgADefault: Promise<import("pkg-a").A>;
    export declare const pkgAThing: Promise<import("pkg-a").A>;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=pkg-b.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/dist/pkg-b.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=pkg-b.cjs.d.ts.map

  `);
});

test("no __esModule when reexporting namespace with mjs proxy", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@mjs-proxy-no-__esmodule/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.js"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "packages/pkg-a/something/package.json": JSON.stringify({
      main: "dist/pkg-a-something.cjs.js",
      module: "dist/pkg-a-something.esm.js",
    }),
    "packages/pkg-a/src/index.js": ts`
      export * as somethingNs from "./something";
    `,
    "packages/pkg-a/src/something.js": ts`
      export const something = "something";
      export default 100;
    `,

    "packages/pkg-a/node_modules": {
      kind: "symlink",
      path: repoNodeModules,
    },
    "runtime-blah.mjs": ts`
      let counter = 0;
      function acceptThing(actual, expected) {
        console.log(++counter, "actual", actual, "expected", expected);
      }

      import * as ns from "pkg-a";

      acceptThing(ns.somethingNs.something, "something");
      acceptThing(ns.somethingNs.default, 100);
      acceptThing(ns.__esModule, undefined);
    `,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "nodenext",
        strict: true,
        declaration: true,
      },
    }),
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.dev.js, packages/pkg-a/dist/pkg-a.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const something = "something";
    var something$1 = 100;

    var something$2 = /*#__PURE__*/Object.freeze({
    	__proto__: null,
    	something: something,
    	'default': something$1
    });

    exports.somethingNs = something$2;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg-a.cjs.prod.js");
    } else {
      module.exports = require("./pkg-a.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      somethingNs
    } from "./pkg-a.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const something = "something";
    var something$1 = 100;

    var something$2 = /*#__PURE__*/Object.freeze({
    	__proto__: null,
    	something: something,
    	'default': something$1
    });

    export { something$2 as somethingNs };

  `);

  let node = await spawn("node", ["runtime-blah.mjs"], { cwd: dir });

  expect(node.code).toBe(0);
  expect(node.stdout.toString("utf8")).toMatchInlineSnapshot(`
    "1 actual something expected something
    2 actual 100 expected 100
    3 actual undefined expected undefined
    "
  `);
  expect(node.stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
});

test("export * from external", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "repo",
      preconstruct: { packages: ["packages/pkg-a"] },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: {
          importConditionDefaultExport: "default",
        },
      },
      dependencies: {
        "external-pkg": "*",
      },
    }),
    "packages/pkg-a/something/package.json": JSON.stringify({
      main: "dist/pkg-a-something.cjs.js",
      module: "dist/pkg-a-something.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export * from "external-pkg";
      export const a = true;
      export default "default";
    `,
    "blah.mts": ts`
      function acceptThing<T>(x: T) {}
      import * as ns from "pkg-a";
      import def from "pkg-a";
      import { a, fromExternal } from "pkg-a";
      acceptThing<{ a: boolean; fromExternal: string; default: string }>(ns);
      acceptThing<string>(def);
      acceptThing<boolean>(a);
      acceptThing<string>(fromExternal);

      acceptThing<boolean>(fromExternal); // should fail
      import { __esModule } from "pkg-a"; // should fail
    `,
    "runtime-blah.mjs": js`
      let counter = 0;
      function acceptThing(actual, expected) {
        console.log(++counter, "actual", actual, "expected", expected);
      }

      import * as ns from "pkg-a";

      acceptThing(ns.default, "default");
      acceptThing(ns.a, true);
      acceptThing(ns.fromExternal, "from-external");
      acceptThing(ns.__esModule, true);
    `,
    "node_modules/external-pkg/index.js": js`
      exports.fromExternal = "from-external";
    `,
    "node_modules/external-pkg/index.d.ts": ts`
      export const fromExternal: string;
    `,
    ...tsSetupFiles,
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "external-pkg";
    export declare const a = true;
    declare const _default: "default";
    export default _default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    import ns from "./declarations/src/index.js";
    export default ns.default;
    //# sourceMappingURL=pkg-a.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.mts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    export { default } from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.dev.js, packages/pkg-a/dist/pkg-a.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var externalPkg = require('external-pkg');

    const a = true;
    var index = "default";

    exports.a = a;
    exports["default"] = index;
    Object.keys(externalPkg).forEach(function (k) {
    	if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
    		enumerable: true,
    		get: function () { return externalPkg[k]; }
    	});
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg-a.cjs.prod.js");
    } else {
      module.exports = require("./pkg-a.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./pkg-a.cjs.js";
    import ns from "./pkg-a.cjs.js";
    export default ns.default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from 'external-pkg';

    const a = true;
    var index = "default";

    export { a, index as default };

  `);

  let node = await spawn("node", ["runtime-blah.mjs"], { cwd: dir });

  expect(node.code).toBe(0);
  expect(node.stdout.toString("utf8")).toMatchInlineSnapshot(`
    "1 actual default expected default
    2 actual true expected true
    3 actual from-external expected from-external
    4 actual true expected true
    "
  `);
  expect(node.stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
  let { code, stdout, stderr } = await spawn(tscBinPath, [], { cwd: dir });
  expect(code).toBe(2);
  expect(stdout.toString("utf8")).toMatchInlineSnapshot(`
    "blah.mts(10,22): error TS2345: Argument of type 'string' is not assignable to parameter of type 'boolean'.
    blah.mts(11,10): error TS2614: Module '"pkg-a"' has no exported member '__esModule'. Did you mean to use 'import __esModule from "pkg-a"' instead?
    "
  `);
  expect(stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
});

test("type only export imported in .mts", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "repo",
      preconstruct: { packages: ["packages/pkg-a"] },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg-a.esm.js",
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: { importConditionDefaultExport: "default" },
      },
    }),
    "packages/pkg-a/something/package.json": JSON.stringify({
      main: "dist/pkg-a-something.cjs.js",
      module: "dist/pkg-a-something.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export type SomeType = string;
    `,
    "blah.mts": ts`
      function acceptThing<T>(x: T) {}
      import { SomeType } from "pkg-a";
      acceptThing<SomeType>("");
      acceptThing<SomeType>(true); // should fail
    `,
    ...tsSetupFiles,
  });
  await fs.ensureSymlink(
    path.join(dir, "packages/pkg-a"),
    path.join(dir, "node_modules/pkg-a")
  );
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare type SomeType = string;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=pkg-a.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.mts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.dev.js, packages/pkg-a/dist/pkg-a.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';


    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg-a.cjs.prod.js");
    } else {
      module.exports = require("./pkg-a.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      
    } from "./pkg-a.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯


  `);

  let { code, stdout, stderr } = await spawn(tscBinPath, [], { cwd: dir });
  expect(code).toBe(2);
  expect(stdout.toString("utf8")).toMatchInlineSnapshot(`
    "blah.mts(4,23): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string'.
    "
  `);
  expect(stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
});
