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

    exports.default = index;

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

    "packages/pkg-a/node_modules": {
      kind: "symlink",
      path: repoNodeModules,
    },
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
  let { code, stdout, stderr } = await spawn(
    path.join(
      path.dirname(require.resolve("typescript/package.json")),
      "bin/tsc"
    ),
    [],
    { cwd: dir }
  );
  expect(code).toBe(2);
  expect(stdout.toString("utf8")).toMatchInlineSnapshot(`
    "blah.ts(3,29): error TS2307: Cannot find module 'pkg-a/not-exported' or its corresponding type declarations.
    blah.ts(11,22): error TS2345: Argument of type '"index"' is not assignable to parameter of type '"other"'.
    blah.ts(12,22): error TS2345: Argument of type '"something"' is not assignable to parameter of type '"other"'.
    "
  `);
  expect(stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
});
