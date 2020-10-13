import build from "../";
import fixturez from "fixturez";
import path from "path";
import {
  snapshotDirectory,
  stripHashes,
  testdir,
  getDist,
  js,
  getFiles,
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
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "multiple-entrypoints",
      main: "dist/multiple-entrypoints.cjs.js",
      module: "dist/multiple-entrypoints.esm.js",
      preconstruct: {
        source: "src/sum",
        entrypoints: [".", "multiply"],
      },
    }),
    "multiply/package.json": JSON.stringify({
      main: "dist/multiple-entrypoints.cjs.js",
      module: "dist/multiple-entrypoints.esm.js",
      preconstruct: {
        source: "../src/multiply.js",
      },
    }),
    "src/sum.js": js`
                    export let sum = (a, b) => a + b;
                  `,
    "src/multiply.js": js`
                         export let multiply = (a, b) => a * b;
                       `,
  });

  await build(dir);

  expect(await getFiles(dir, ["**/dist/**"])).toMatchInlineSnapshot(`
    dist/multiple-entrypoints.cjs.dev.js -------------
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let sum = (a, b) => a + b;

    exports.sum = sum;

    dist/multiple-entrypoints.cjs.js, multiply/dist/multiple-entrypoints.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./multiple-entrypoints.cjs.prod.js");
    } else {
      module.exports = require("./multiple-entrypoints.cjs.dev.js");
    }

    dist/multiple-entrypoints.cjs.prod.js -------------
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: !0
    });

    let sum = (a, b) => a + b;

    exports.sum = sum;

    dist/multiple-entrypoints.esm.js -------------
    let sum = (a, b) => a + b;

    export { sum };

    multiply/dist/multiple-entrypoints.cjs.dev.js -------------
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let multiply = (a, b) => a * b;

    exports.multiply = multiply;

    multiply/dist/multiple-entrypoints.cjs.prod.js -------------
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: !0
    });

    let multiply = (a, b) => a * b;

    exports.multiply = multiply;

    multiply/dist/multiple-entrypoints.esm.js -------------
    let multiply = (a, b) => a * b;

    export { multiply };

  `);
});

test("two entrypoints, one module, one not", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "two-entrypoints-one-module-one-not",
      main: "dist/two-entrypoints-one-module-one-not.cjs.js",
      preconstruct: {
        source: "src/sum",
        entrypoints: [".", "multiply"],
      },
    }),
    "multiply/package.json": JSON.stringify({
      main: "dist/two-entrypoints-one-module-one-not.cjs.js",
      module: "dist/two-entrypoints-one-module-one-not.esm.js",
      preconstruct: {
        source: "../src/multiply.js",
      },
    }),
    "src/sum.js": js`
                    export let sum = (a, b) => a + b;
                  `,
    "src/multiply.js": js`
                         export let multiply = (a, b) => a * b;
                       `,
  });

  await expect(build(dir)).rejects.toMatchInlineSnapshot(
    `[Error: two-entrypoints-one-module-one-not/multiply has a module build but two-entrypoints-one-module-one-not does not have a module build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.]`
  );
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
