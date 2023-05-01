import spawn from "spawndamnit";
import path from "path";
import * as fs from "fs-extra";
import * as realFs from "fs";
import {
  getFiles,
  js,
  repoNodeModules,
  testdir,
  ts,
  typescriptFixture,
} from "../../test-utils";
import dev from "../dev";
import normalizePath from "normalize-path";
import escapeStringRegexp from "escape-string-regexp";

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
  let tmpPath = realFs.realpathSync.native(
    await testdir({
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
    })
  );

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
          distPath,
          path.dirname(require.resolve("@preconstruct/hook"))
        )
      ),

      "RELATIVE_PATH_TO_PRECONSTRUCT_HOOK"
    )
  ).toMatchInlineSnapshot(`
    ""use strict";
    // this file might look strange and you might be wondering what it's for
    // it's lets you import your source files by importing this entrypoint
    // as you would import it if it was built with preconstruct build
    // this file is slightly different to some others though
    // it has a require hook which compiles your code with Babel
    // this means that you don't have to set up @babel/register or anything like that
    // but you can still require this module and it'll be compiled

    // this bit of code imports the require hook and registers it
    let unregister = require("RELATIVE_PATH_TO_PRECONSTRUCT_HOOK").___internalHook(typeof __dirname === 'undefined' ? undefined : __dirname, "..", "..");

    // this re-exports the source file
    module.exports = require("../src/index.js");

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
    expect.stringMatching(
      new RegExp(`${escapeStringRegexp(path.join("src", "index.js"))}:5$`)
    )
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

  expect(await getFiles(tmpPath, ["**/*.flow"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ a/dist/flow-dev-a.cjs.js.flow ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    // @flow
    export * from "../../src/a.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ b/dist/flow-dev-b.cjs.js.flow ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    // @flow
    export * from "../../src/b.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/flow-dev.cjs.js.flow ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    // @flow
    export * from "../src/index.js";

  `);
});

test("typescript", async () => {
  let tmpPath = await testdir(typescriptFixture);

  await dev(tmpPath);

  expect(await getFiles(tmpPath, ["**/*.d.ts{,.map}", "!node_modules/**"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index";
    export { default } from "../src/index";
    //# sourceMappingURL=typescript.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"typescript.cjs.d.ts","sourceRoot":"","sources":["../src/index.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ src/one-more-thing.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    declare var obj: object;

    export { obj };
  `);
});

test("exports field with worker condition", async () => {
  let tmpPath = realFs.realpathSync.native(
    await testdir({
      "package.json": JSON.stringify({
        name: "@something/blah",
        main: "dist/something-blah.cjs.js",
        module: "dist/something-blah.esm.js",
        exports: {
          ".": {
            module: {
              worker: "./dist/something-blah.worker.esm.js",
              default: "./dist/something-blah.esm.js",
            },
            default: "./dist/something-blah.cjs.js",
          },
          "./package.json": "./package.json",
        },
        preconstruct: {
          exports: {
            envConditions: ["worker"],
          },
        },
      }),
      "src/index.js": "console.log(1)",
    })
  );
  await dev(tmpPath);
  const files = await getFiles(tmpPath, [
    "dist/**",
    "!dist/something-blah.cjs.js",
  ]);
  expect(files).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/something-blah.esm.js, dist/something-blah.worker.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    console.log(1)
  `);
  await Promise.all(
    Object.keys(files).map(async (filename) => {
      expect(await fs.realpath(path.join(tmpPath, filename))).toEqual(
        path.join(tmpPath, "src/index.js")
      );
    })
  );
});

test("flow and .d.ts", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
    }),
    "src/index.js": js`
      // @flow

      export const x = "hello";
    `,
    "src/index.d.ts": ts`
      export const x: string;
    `,
  });
  await dev(tmpPath);
  const files = await getFiles(tmpPath, ["dist/**", "!dist/pkg.cjs.js"]);
  expect(files).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index.js";
    //# sourceMappingURL=pkg.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg.cjs.d.ts","sourceRoot":"","sources":["../src/index.js"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js.flow ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    // @flow
    export * from "../src/index.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    // @flow

    export const x = "hello";
  `);
});
test(".d.ts file with default export", async () => {
  let dir = await testdir({
    node_modules: { kind: "symlink", path: repoNodeModules },
    "package.json": JSON.stringify({
      name: "typescript",
      main: "dist/typescript.cjs.js",
      module: "dist/typescript.esm.js",
      dependencies: {
        typescript: "^3.4.5",
      },
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "esnext",
        module: "commonjs",
        strict: true,
        esModuleInterop: true,
        noEmit: true,
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    "src/index.js": js`
      export const a = true;
      export default a;
    `,
    "src/index.d.ts": ts`
      export declare const a: boolean;
      export default a;
    `,
  });
  await dev(dir);
  expect(await getFiles(dir, ["dist/typescript.cjs.d.ts"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index.js";
    export { default } from "../src/index.js";
    //# sourceMappingURL=typescript.cjs.d.ts.map

  `);
});

test("with default", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@mjs-proxy/repo",
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
          import: "./dist/pkg-a.cjs.mjs",
          default: "./dist/pkg-a.cjs.js",
        },
        "./something": {
          module: "./something/dist/pkg-a-something.esm.js",
          import: "./something/dist/pkg-a-something.cjs.mjs",
          default: "./something/dist/pkg-a-something.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts", "something.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "packages/pkg-a/something/package.json": JSON.stringify({
      main: "dist/pkg-a-something.cjs.js",
      module: "dist/pkg-a-something.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "index";
      export default true;
    `,
    "packages/pkg-a/src/something.ts": ts`
      export const something = "something";
      export default 100;
    `,
    "packages/pkg-a/not-exported.ts": ts`
      export const notExported = true;
      export default "foo";
    `,

    "packages/pkg-a/node_modules": {
      kind: "symlink",
      path: repoNodeModules,
    },
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
  await dev(dir);

  expect(
    await getFiles(dir, [
      "packages/**/dist/**",
      "!packages/**/dist/*.cjs.js",
      "!**/node_modules",
    ])
  ).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index.js";
    import ns from "../src/index.js";
    export default ns.default;
    //# sourceMappingURL=pkg-a.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.mts","sourceRoot":"","sources":["../src/index.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index";
    export { default } from "../src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["../src/index.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./pkg-a.cjs.js";
    import ns from "./pkg-a.cjs.js";
    export default ns.default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export const thing = "index";
    export default true;
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../../src/something.js";
    import ns from "../../src/something.js";
    export default ns.default;
    //# sourceMappingURL=pkg-a-something.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a-something.cjs.d.mts","sourceRoot":"","sources":["../../src/something.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../../src/something";
    export { default } from "../../src/something";
    //# sourceMappingURL=pkg-a-something.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a-something.cjs.d.ts","sourceRoot":"","sources":["../../src/something.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./pkg-a-something.cjs.js";
    import ns from "./pkg-a-something.cjs.js";
    export default ns.default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export const something = "something";
    export default 100;
  `);
});
