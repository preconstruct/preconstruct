import * as fs from "fs-extra";
import path from "path";
import build from "../";
import { js, testdir } from "../../../test-utils";

test("Oxc is the default transform", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "oxc-default",
      main: "dist/oxc-default.cjs.js",
      module: "dist/oxc-default.esm.js",
      preconstruct: { exports: false, imports: false },
    }),
    "src/index.js": js`
      export const value = globalThis.object?.value;
    `,
  });

  await build(dir);
  const output = await fs.readFile(
    path.join(dir, "dist/oxc-default.cjs.js"),
    "utf8"
  );
  expect(output).toContain("?.value");
});

test("passes an Oxc target through to Rolldown", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "oxc-target",
      main: "dist/oxc-target.cjs.js",
      module: "dist/oxc-target.esm.js",
      preconstruct: {
        exports: false,
        imports: false,
        transform: { type: "oxc", target: "es2019" },
      },
    }),
    "src/index.js": js`
      export const value = globalThis.object?.value;
    `,
  });

  await build(dir);
  const output = await fs.readFile(
    path.join(dir, "dist/oxc-target.cjs.js"),
    "utf8"
  );
  expect(output).not.toContain("?.value");
});

test("Babel mode requires consumer-installed @babel/core", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "babel-missing",
      main: "dist/babel-missing.cjs.js",
      module: "dist/babel-missing.esm.js",
      preconstruct: {
        exports: false,
        imports: false,
        transform: "babel",
      },
    }),
    "src/index.js": "export const value = true;",
  });

  await expect(build(dir)).rejects.toThrow(
    'Babel was selected with "preconstruct.transform" but @babel/core is not installed'
  );
});
