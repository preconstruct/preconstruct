import fixturez from "fixturez";
import spawn from "spawndamnit";
import path from "path";
import * as fs from "fs-extra";
import { install, testdir, getDist, js } from "../../test-utils";
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
    path.join(tmpPath, "packages", "package-one"),
  ]);
  expect(code).toBe(0);
  expect(stdout.toString().split("\n")).toEqual([
    "message from package two",
    "message from package one",
    "message from package two but logged by package one",
    "",
  ]);
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
    "all-the-build-types.esm.js",
  ]);

  expect(
    (
      await fs.readFile(
        path.join(distPath, "all-the-build-types.cjs.js"),
        "utf-8"
      )
    ).replace(
      path.relative(tmpPath, require.resolve("@preconstruct/hook")),
      "RELATIVE_PATH_TO_PRECONSTRUCT_HOOK"
    )
  ).toMatchSnapshot();

  let shouldBeCjsThingsToSource = [
    "all-the-build-types.esm.js",
    "all-the-build-types.browser.cjs.js",
    "all-the-build-types.browser.esm.js",
  ];

  await Promise.all(
    shouldBeCjsThingsToSource.map(async (filename) => {
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

module.exports = require("../src/index.js")
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
    stderr.toString().trim().split("\n")[0]
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
  ).toMatchSnapshot();

  expect(
    await fs.readFile(
      path.join(tmpPath, "a", "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchSnapshot();

  expect(
    await fs.readFile(
      path.join(tmpPath, "b", "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchSnapshot();
});

test("typescript", async () => {
  let tmpPath = f.copy("typescript");

  await install(tmpPath);

  await dev(tmpPath);

  expect(
    await fs.readFile(path.join(tmpPath, "dist", "typescript.cjs.d.ts"), "utf8")
  ).toMatchSnapshot();
});

test("node esm", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      exports: {
        ".": {
          import: "./dist/test.mjs",
          require: "./dist/test.cjs.js",
        },
      },
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          nodeESM: true,
        },
      },
    }),
    "src/index.js": js`
                      export * from "./thing";
                    `,
    "src/thing.js": js`
                      export * from ".";
                      export let x = true;
                    `,
  });
  await dev(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    dist/test.cjs.js -------------
    "use strict";
    // this file might look strange and you might be wondering what it's for
    // it's lets you import your source files by importing this entrypoint
    // as you would import it if it was built with preconstruct build
    // this file is slightly different to some others though
    // it has a require hook which compiles your code with Babel
    // this means that you don't have to set up @babel/register or anything like that
    // but you can still require this module and it'll be compiled

    const path = require("path");

    // this bit of code imports the require hook and registers it
    let unregister = require("../../../../../../../../Users/mitchell/projects/preconstruct/packages/hook/dist/hook.cjs.js").___internalHook(path.resolve(__dirname, ".."), path.resolve(__dirname, ".."));

    // this re-exports the source file
    module.exports = require("../src/index.js");

    // this unregisters the require hook so that any modules required after this one
    // aren't compiled with the require hook in case you have some other require hook
    // or something that should be used on other modules
    unregister();

    dist/test.mjs -------------
    import ___preconstruct_module_namespace from "./test.cjs.js";

  `);
});
