import build from "../";
import fixturez from "fixturez";
import path from "path";
import {
  snapshotDirectory,
  stripHashes,
  testdir,
  getDist,
  js,
} from "../../../test-utils";

const f = fixturez(__dirname);

jest.setTimeout(10000);

jest.mock("../../prompt");

test("source entrypoint option", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "source-entrypoint-option",
      main: "dist/source-entrypoint-option.cjs.js",
      preconstruct: {
        source: "modules",
      },
    }),
    "modules/index.js": js`
                          export let something = "";
                        `,
  });

  await build(tmpPath);

  expect(await getDist(tmpPath)).toMatchInlineSnapshot(`
    dist/source-entrypoint-option.cjs.dev.js -------------
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let something = "";

    exports.something = something;

    dist/source-entrypoint-option.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./source-entrypoint-option.cjs.prod.js");
    } else {
      module.exports = require("./source-entrypoint-option.cjs.dev.js");
    }

    dist/source-entrypoint-option.cjs.prod.js -------------
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: !0
    });

    let something = "";

    exports.something = something;

  `);
});

test("source entrypoint option flow", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      preconstruct: {
        source: "modules",
      },
    }),
    "modules/index.js": js`
                          // @flow
                          
                          export let something = "";
                        `,
  });

  await build(tmpPath);

  expect(await getDist(tmpPath)).toMatchInlineSnapshot(`
    dist/test.cjs.dev.js -------------
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    // @flow
    let something = "";

    exports.something = something;

    dist/test.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    dist/test.cjs.js.flow -------------
    // @flow
    export * from "../modules/index.js";

    dist/test.cjs.prod.js -------------
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: !0
    });

    let something = "";

    exports.something = something;

  `);
});

test("multiple entrypoints", async () => {
  let tmpPath = f.copy("multiple-entrypoints");

  await build(tmpPath);

  await snapshotDirectory(tmpPath);
});

test("two entrypoints, one module, one not", async () => {
  let tmpPath = f.copy("two-entrypoints-one-module-one-not");
  try {
    await build(tmpPath);
  } catch (err) {
    expect(err).toMatchInlineSnapshot(
      `[Error: two-entrypoints-one-module-one-not/multiply has a module build but two-entrypoints-one-module-one-not does not have a module build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.]`
    );
    return;
  }
  expect(true).toBe(false);
});

test("two entrypoints with a common dependency", async () => {
  let tmpPath = f.copy("common-dependency-two-entrypoints");

  await build(tmpPath);

  await snapshotDirectory(tmpPath, await stripHashes("identity"));
  let root = require(tmpPath);
  let other = require(path.join(tmpPath, "multiply"));
  expect(typeof root.identity).toBe("function");
  expect(root.identity).toBe(other.identity);
});

test("two entrypoints where one requires the other entrypoint", async () => {
  let tmpPath = f.copy("importing-another-entrypoint");

  await build(tmpPath);

  await snapshotDirectory(tmpPath);

  let { identity } = require(tmpPath);
  expect(identity(20)).toBe(20);

  let { multiply } = require(path.join(tmpPath, "multiply"));

  expect(multiply(2, 3)).toBe(6);
});
