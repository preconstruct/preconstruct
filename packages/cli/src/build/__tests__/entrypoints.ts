import build from "../";
import path from "path";
import spawn from "spawndamnit";
import {
  snapshotDirectory,
  stripHashes,
  testdir as testdirWithNextMajorDefaults,
  testdirWithLegacyPreconstructDefaults as testdir,
  js,
  getFiles,
} from "../../../test-utils";

vi.setConfig({ testTimeout: 10000 });

vi.mock("../../prompt");

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
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    //#region src/index.js
    let sum = (a, b) => a + b;
    //#endregion
    exports.sum = sum;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    //#region src/index.js
    let sum = (a, b) => a + b;
    //#endregion
    export { sum };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    //#region src/multiply.js
    let multiply = (a, b) => a * b;
    //#endregion
    exports.multiply = multiply;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    //#region src/multiply.js
    let multiply = (a, b) => a * b;
    //#endregion
    export { multiply };
  `);
});

test("multiple entrypoints with default imports and exports", async () => {
  let dir = await testdirWithNextMajorDefaults({
    "package.json": JSON.stringify({
      name: "multiple-entrypoints",
      main: "dist/multiple-entrypoints.cjs.js",
      module: "dist/multiple-entrypoints.esm.js",
      exports: {
        ".": {
          types: "./dist/multiple-entrypoints.cjs.js",
          module: "./dist/multiple-entrypoints.esm.js",
          default: "./dist/multiple-entrypoints.cjs.js",
        },
        "./multiply": {
          types: "./multiply/dist/multiple-entrypoints-multiply.cjs.js",
          module: "./multiply/dist/multiple-entrypoints-multiply.esm.js",
          default: "./multiply/dist/multiple-entrypoints-multiply.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: true,
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
    "runtime-blah.js": js`
      console.log(require("multiple-entrypoints/multiply").multiply(2, 2));
    `,
  });

  await build(dir);

  expect(await getFiles(dir, ["**/dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    //#region src/index.js
    let sum = (a, b) => a + b;
    //#endregion
    exports.sum = sum;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    //#region src/index.js
    let sum = (a, b) => a + b;
    //#endregion
    export { sum };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    //#region src/multiply.js
    let multiply = (a, b) => a * b;
    //#endregion
    exports.multiply = multiply;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    //#region src/multiply.js
    let multiply = (a, b) => a * b;
    //#endregion
    export { multiply };
  `);

  let { code, stdout, stderr } = await spawn("node", [
    path.join(dir, "runtime-blah.js"),
  ]);
  expect(stderr.toString()).toBe("");
  expect(stdout.toString().split("\n")).toEqual(["4", ""]);
  expect(code).toBe(0);
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
