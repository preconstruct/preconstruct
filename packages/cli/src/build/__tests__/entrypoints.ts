import build from "../";
import path from "path";
import {
  snapshotDirectory,
  stripHashes,
  testdir,
  js,
  getFiles,
} from "../../../test-utils";

jest.setTimeout(10000);

jest.mock("../../prompt");

test("multiple entrypoints", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "multiple-entrypoints",
      main: "dist/multiple-entrypoints.cjs.js",
      module: "dist/multiple-entrypoints.esm.js",
      preconstruct: {
        entrypoints: ["index.js", "multiply.js"],
      },
    }),
    "multiply/package.json": JSON.stringify({
      main: "dist/multiple-entrypoints-multiply.cjs.js",
      module: "dist/multiple-entrypoints-multiply.esm.js",
    }),
    "src/index.js": js`
                      export let sum = (a, b) => a + b;
                    `,
    "src/multiply.js": js`
                         export let multiply = (a, b) => a * b;
                       `,
  });

  await build(dir);

  expect(await getFiles(dir, ["**/dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.cjs.dev.js, dist/multiple-entrypoints.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let sum = (a, b) => a + b;

    exports.sum = sum;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./multiple-entrypoints.cjs.prod.js");
    } else {
      module.exports = require("./multiple-entrypoints.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.esm.dev.js, dist/multiple-entrypoints.esm.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    let sum = (a, b) => a + b;

    export { sum };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./multiple-entrypoints.esm.prod.js");
    } else {
      module.exports = require("./multiple-entrypoints.esm.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.cjs.dev.js, multiply/dist/multiple-entrypoints-multiply.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let multiply = (a, b) => a * b;

    exports.multiply = multiply;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./multiple-entrypoints-multiply.cjs.prod.js");
    } else {
      module.exports = require("./multiple-entrypoints-multiply.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.esm.dev.js, multiply/dist/multiple-entrypoints-multiply.esm.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    let multiply = (a, b) => a * b;

    export { multiply };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./multiple-entrypoints-multiply.esm.prod.js");
    } else {
      module.exports = require("./multiple-entrypoints-multiply.esm.dev.js");
    }

  `);
});

test("two entrypoints, one module, one not", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "two-entrypoints-one-module-one-not",
      main: "dist/two-entrypoints-one-module-one-not.cjs.js",
      preconstruct: {
        entrypoints: ["index.js", "multiply.js"],
      },
    }),
    "multiply/package.json": JSON.stringify({
      main: "dist/two-entrypoints-one-module-one-not-multiply.cjs.js",
      module: "dist/two-entrypoints-one-module-one-not-multiply.esm.js",
    }),
    "src/index.js": js`
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
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "common-dependency-two-entrypoints",
      main: "dist/common-dependency-two-entrypoints.cjs.js",
      module: "dist/common-dependency-two-entrypoints.esm.js",

      preconstruct: {
        entrypoints: ["index.js", "multiply.js"],
      },
    }),

    "multiply/package.json": JSON.stringify({
      main: "dist/common-dependency-two-entrypoints-multiply.cjs.js",
      module: "dist/common-dependency-two-entrypoints-multiply.esm.js",
    }),

    "src/identity.js": js`
                         export let identity = (x) => x;
                       `,

    "src/multiply.js": js`
                         import { identity } from "./identity";

                         export let multiply = (a, b) => identity(a * b);

                         export { identity };
                       `,

    "src/index.js": js`
                      import { identity } from "./identity";

                      export let sum = (a, b) => identity(a + b);

                      export { identity };
                    `,
  });

  await build(tmpPath);

  await snapshotDirectory(tmpPath, await stripHashes("identity"));
  let root = require(tmpPath);
  let other = require(path.join(tmpPath, "multiply"));
  expect(typeof root.identity).toBe("function");
  expect(root.identity).toBe(other.identity);
});

test("two entrypoints where one requires the other entrypoint", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "importing-another-entrypoint",
      main: "dist/importing-another-entrypoint.cjs.js",

      preconstruct: {
        entrypoints: ["index.js", "multiply.js"],
      },
    }),

    "multiply/package.json": JSON.stringify({
      main: "dist/importing-another-entrypoint-multiply.cjs.js",
    }),

    "src/index.js": js`
                      export let identity = (x) => x;
                    `,

    "src/multiply.js": js`
                         import { identity } from "./index";

                         export let multiply = (a, b) => identity(a * b);
                       `,
  });

  await build(tmpPath);

  await snapshotDirectory(tmpPath);

  let { identity } = require(tmpPath);
  expect(identity(20)).toBe(20);

  let { multiply } = require(path.join(tmpPath, "multiply"));

  expect(multiply(2, 3)).toBe(6);
});
