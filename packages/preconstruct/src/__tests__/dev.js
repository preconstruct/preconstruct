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

  await install(tmpPath);

  await dev(tmpPath);

  let sourceFile = path.join(tmpPath, "src", "index.js");

  let distPath = path.join(tmpPath, "dist");
  expect(await fs.readdir(distPath)).toEqual([
    "all-the-build-types.browser.cjs.js",
    "all-the-build-types.browser.esm.js",
    "all-the-build-types.cjs.js",
    "all-the-build-types.esm.js",
    "all-the-build-types.native.cjs.js",
    "all-the-build-types.native.esm.js"
  ]);

  let cjsDistPath = path.join(distPath, "all-the-build-types.cjs.js");
  let esmDistPath = path.join(distPath, "all-the-build-types.esm.js");

  expect(
    (await fs.readFile(cjsDistPath, "utf-8"))
      .replace(/require\('[^']+'\)/g, "thisWasARequireCall()")
      .replace(/___internalHook\('[^']+'\)/, "thisWasA___internalHookCall()")
  ).toMatchInlineSnapshot(`
"'use strict';

let unregister = thisWasARequireCall().thisWasA___internalHookCall();

module.exports = thisWasARequireCall();

unregister();
"
`);

  expect(await fs.readlink(esmDistPath)).toBe(sourceFile);

  let shouldBeSymlinkedToSource = [
    "all-the-build-types.browser.cjs.js",
    "all-the-build-types.native.cjs.js",
    "all-the-build-types.browser.esm.js",
    "all-the-build-types.native.esm.js"
  ];

  await Promise.all(
    shouldBeSymlinkedToSource.map(async filename => {
      expect(await fs.readlink(path.join(distPath, filename))).toBe(sourceFile);
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
    await fs.readlink(path.join(tmpPath, "dist", "flow-dev.cjs.js.flow"))
  ).toBe(path.join(tmpPath, "src", "index.js"));
  expect(
    await fs.readFile(
      path.join(tmpPath, "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchInlineSnapshot(`
"// @flow

export let something = true;
"
`);

  expect(
    await fs.readFile(
      path.join(tmpPath, "a", "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchInlineSnapshot(`
"// @flow

export default \\"something\\";
"
`);

  expect(
    await fs.readFile(
      path.join(tmpPath, "b", "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchInlineSnapshot(`
"// @flow

let something = true;

export { something as default };
"
`);
});
