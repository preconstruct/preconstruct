// @flow
import fixturez from "fixturez";
import spawn from "spawndamnit";
import path from "path";
import * as fs from "fs-extra";
import { install } from "../../test-utils";
import dev from "../dev";

const f = fixturez(__dirname);

jest.mock("../prompt");

// TODO: make it so we don't have to do this
jest.setTimeout(20000);

test("dev command works in node", async () => {
  let tmpPath = f.copy("valid-monorepo-that-logs-stuff");

  await install(tmpPath);

  await dev(tmpPath);

  // i would require it but i don't want jest to do magical things
  let { code, stdout, stderr } = await spawn("node", [
    path.join(tmpPath, "packages", "package-one")
  ]);
  expect(code).toBe(0);
  expect(stdout.toString().split("\n")).toEqual([
    "message from package two",
    "message from package one",
    "message from package two but logged by package one",
    ""
  ]);
  expect(stdout.toString()).toMatchInlineSnapshot(`
    "message from package two
    message from package one
    message from package two but logged by package one
    "
  `);
  expect(stderr.toString()).toBe("");
});

test("all the build types", async () => {
  // TODO: maybe actually require them

  let tmpPath = f.copy("all-the-build-types");

  await dev(tmpPath);

  let distPath = path.join(tmpPath, "dist");
  expect(await fs.readdir(distPath)).toEqual([
    "all-the-build-types.browser.cjs.js",
    "all-the-build-types.browser.esm.js",
    "all-the-build-types.cjs.js",
    "all-the-build-types.esm.js"
  ]);

  expect(
    (await fs.readFile(
      path.join(distPath, "all-the-build-types.cjs.js"),
      "utf-8"
    ))
      .replace(/require\("[^"]+"\)/g, "thisWasARequireCall()")
      .replace(/___internalHook\("[^"]+"\)/, "thisWasA___internalHookCall()")
  ).toMatchInlineSnapshot(`
    "\\"use strict\\";

    let unregister = thisWasARequireCall().thisWasA___internalHookCall();

    module.exports = thisWasARequireCall();

    unregister();
    "
  `);

  let shouldBeCjsThingsToSource = [
    "all-the-build-types.esm.js",
    "all-the-build-types.browser.cjs.js",
    "all-the-build-types.browser.esm.js"
  ];

  await Promise.all(
    shouldBeCjsThingsToSource.map(async filename => {
      let content = await fs.readFile(path.join(distPath, filename), "utf8");

      expect(content).toBe(`// 👋 hey!!
// you might be reading this and seeing .esm in the filename
// and being confused why there is commonjs below this filename
// DON'T WORRY!
// this is intentional
// it's only commonjs with \`preconstruct dev\`
// when you run \`preconstruct build\`, it will be ESM
// why is it commonjs?
// we need to re-export every export from the source file
// but we can't do that with ESM without knowing what the exports are (because default exports aren't included in export/import *)
// and they could change after running \`preconstruct dev\` so we can't look at the file without forcing people to
// run preconstruct dev again which wouldn't be ideal
// this solution could change but for now, it's working

module.exports = require("${path.join(tmpPath, "src", "index.js")}")
`);
    })
  );
});

test("source maps work", async () => {
  let tmpPath = f.copy("uses-babel-and-throws-error");

  await install(tmpPath);

  await dev(tmpPath);

  // i would require it but i don't want jest to do magical things
  let { code, stdout, stderr } = await spawn("node", [tmpPath]);

  expect(code).toBe(1);
  expect(stdout.toString()).toBe("");
  expect(
    // this is easier than using a stack trace parser
    stderr
      .toString()
      .trim()
      .split("\n")[0]
  ).toEqual(
    // the important thing we're checking is that it's mapping to line 5
    expect.stringMatching(/uses-babel-and-throws-error\/src\/index\.js:5$/)
  );
});

test("flow", async () => {
  let tmpPath = f.copy("flow-dev");

  await install(tmpPath);

  await dev(tmpPath);

  expect(
    await fs.readFile(
      path.join(tmpPath, "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchInlineSnapshot(`
    "// @flow
    export * from \\"../src/index.js\\";
    "
  `);

  expect(
    await fs.readFile(
      path.join(tmpPath, "a", "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchInlineSnapshot(`
    "// @flow
    export * from \\"../src/index.js\\";
    "
  `);

  expect(
    await fs.readFile(
      path.join(tmpPath, "b", "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchInlineSnapshot(`
    "// @flow
    export * from \\"../src/index.js\\";
    "
  `);
});

test("typescript", async () => {
  let tmpPath = f.copy("typescript");

  await install(tmpPath);

  await dev(tmpPath);

  expect(
    await fs.readFile(
      path.join(tmpPath, "dist", "typescript.cjs.js.ts"),
      "utf8"
    )
  ).toMatchInlineSnapshot(`
    "export * from \\"../src/index\\";
    export { default } from \\"../src/index\\";
    "
  `);
});
