import spawn from "spawndamnit";
import path from "path";
import * as fs from "fs-extra";
import { js, testdir, typescriptFixture } from "../../test-utils";
import dev from "../dev";
import normalizePath from "normalize-path";

jest.mock("../prompt");

// TODO: make it so we don't have to do this
jest.setTimeout(20000);

test("dev command works in node", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "valid-monorepo-that-logs-stuff",
      main: "index.js",

      preconstruct: {
        packages: ["packages/*"],
      },

      workspaces: ["packages/*"],
    }),
    "node_modules/@my-cool-scope/package-two": {
      kind: "symlink",
      path: "packages/package-two",
    },
    "packages/package-one/package.json": JSON.stringify({
      name: "@my-cool-scope/package-one",
      main: "dist/my-cool-scope-package-one.cjs.js",
    }),

    "packages/package-two/package.json": JSON.stringify({
      name: "@my-cool-scope/package-two",
      main: "dist/my-cool-scope-package-two.cjs.js",
      license: "MIT",
      private: true,
    }),

    "packages/package-one/src/index.js": js`
                                           import { message } from "@my-cool-scope/package-two";

                                           console.log("message from package one");
                                           console.log(message);
                                         `,

    "packages/package-two/src/index.js": js`
                                           console.log("message from package two");

                                           export let message = "message from package two but logged by package one";
                                         `,
  });

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

  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "all-the-build-types",
      main: "dist/all-the-build-types.cjs.js",
      module: "dist/all-the-build-types.esm.js",
      browser: {
        "./dist/all-the-build-types.cjs.js":
          "./dist/all-the-build-types.browser.cjs.js",
        "./dist/all-the-build-types.esm.js":
          "./dist/all-the-build-types.browser.esm.js",
      },
    }),
    "src/index.js": js`
                      export default "some cool thing";
                    `,
  });

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
      normalizePath(
        path.relative(
          tmpPath,
          path.dirname(require.resolve("@preconstruct/hook"))
        )
      ),
      "RELATIVE_PATH_TO_PRECONSTRUCT_HOOK"
    )
  ).toMatchInlineSnapshot(`
    "\\"use strict\\";
    // this file might look strange and you might be wondering what it's for
    // it's lets you import your source files by importing this entrypoint
    // as you would import it if it was built with preconstruct build
    // this file is slightly different to some others though
    // it has a require hook which compiles your code with Babel
    // this means that you don't have to set up @babel/register or anything like that
    // but you can still require this module and it'll be compiled

    // this bit of code imports the require hook and registers it
    let unregister = require(\\"../RELATIVE_PATH_TO_PRECONSTRUCT_HOOK\\").___internalHook(typeof __dirname === 'undefined' ? undefined : __dirname, \\"..\\", \\"..\\");

    // this re-exports the source file
    module.exports = require(\\"../src/index.js\\");

    unregister();
    "
  `);

  let shouldBeCjsThingsToSource = [
    "all-the-build-types.esm.js",
    "all-the-build-types.browser.cjs.js",
    "all-the-build-types.browser.esm.js",
  ];

  await Promise.all(
    shouldBeCjsThingsToSource.map(async (filename) => {
      expect(await fs.realpath(path.join(distPath, filename))).toBe(
        path.join(tmpPath, "src/index.js")
      );
    })
  );
});

test("source maps work", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "uses-babel-and-throws-error",
      main: "dist/uses-babel-and-throws-error.cjs.js",
      module: "dist/uses-babel-and-throws-error.esm.js",

      dependencies: {
        "@babel/core": "^7.4.3",
        "@babel/preset-env": "^7.4.3",
        "@babel/runtime": "^7.4.3",
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
    }),
    "src/index.js": js`
                      class Bar {}

                      export class Foo extends Bar {}

                      throw new Error("i'm thrown on line 5");
                    `,
  });

  await dev(tmpPath);

  // i would require it but i don't want jest to do magical things
  let { code, stdout, stderr } = await spawn("node", [tmpPath], {
    env: {
      PATH: process.env.PATH,
    },
  });

  expect(code).toBe(1);
  expect(stdout.toString()).toBe("");
  expect(
    // this is easier than using a stack trace parser
    stderr
      .toString()
      .replace(
        `Browserslist: caniuse-lite is outdated. Please run:\nnpx browserslist@latest --update-db`,
        ""
      )
      .trim()
      .split("\n")[0]
  ).toEqual(
    // the important thing we're checking is that it's mapping to line 5
    expect.stringMatching(/\/src\/index\.js:5$/)
  );
});

test("flow", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "flow-dev",
      main: "dist/flow-dev.cjs.js",
      module: "dist/flow-dev.esm.js",
      preconstruct: {
        entrypoints: ["index.js", "a.js", "b.js"],
      },
    }),

    "a/package.json": JSON.stringify({
      main: "dist/flow-dev-a.cjs.js",
      module: "dist/flow-dev-a.esm.js",
    }),

    "b/package.json": JSON.stringify({
      main: "dist/flow-dev-b.cjs.js",
      module: "dist/flow-dev-b.esm.js",
    }),

    "src/index.js": js`
                      // @flow

                      export let something = true;
                    `,

    "src/a.js": js`
                  // @flow

                  export default "something";
                `,

    "src/b.js": js`
                  // @flow

                  let something = true;

                  export { something as default };
                `,
  });

  await dev(tmpPath);

  expect(
    await fs.readFile(
      path.join(tmpPath, "dist", "flow-dev.cjs.js.flow"),
      "utf8"
    )
  ).toMatchSnapshot();

  expect(
    await fs.readFile(
      path.join(tmpPath, "a", "dist", "flow-dev-a.cjs.js.flow"),
      "utf8"
    )
  ).toMatchSnapshot();

  expect(
    await fs.readFile(
      path.join(tmpPath, "b", "dist", "flow-dev-b.cjs.js.flow"),
      "utf8"
    )
  ).toMatchSnapshot();
});

test("typescript", async () => {
  let tmpPath = await testdir(typescriptFixture);

  await dev(tmpPath);

  expect(
    await fs.readFile(path.join(tmpPath, "dist", "typescript.cjs.d.ts"), "utf8")
  ).toMatchSnapshot();
});

test("typescript", async () => {
  let tmpPath = await testdir({
    ...typescriptFixture,
    "package.json": JSON.stringify({
      ...JSON.parse(typescriptFixture["package.json"]),
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          typeScriptProxyFileWithImportEqualsRequireAndExportEquals: true,
        },
      },
    }),
  });

  await dev(tmpPath);

  await expect(
    fs.readFile(path.join(tmpPath, "dist", "typescript.cjs.d.ts"), "utf8")
  ).resolves.toMatchInlineSnapshot(`
          "import mod = require(\\"../src/index\\");

          export = mod;
          "
        `);
});
