import spawn from "spawndamnit";
import path from "node:path";
import fs from "node:fs/promises";
import {
  getFiles,
  js,
  repoNodeModules,
  repoRoot,
  testdir,
  ts,
  typescriptFixture,
} from "../../test-utils";
import dev from "../dev";
import escapeStringRegexp from "escape-string-regexp";
import { fsEnsureSymlink, normalizePath } from "../utils";

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
    export * from "../src/index.js";
    export { default } from "../src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ src/one-more-thing.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    declare var obj: object;

    export { obj };
  `);
});

test("exports field with worker condition", async () => {
  let tmpPath = await fs.realpath(
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
      "src/index.js": 'console.log("1")',
    })
  );
  await dev(tmpPath);
  const files = await getFiles(tmpPath, [
    "dist/**",
    "!dist/something-blah.cjs.js",
  ]);
  expect(files).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/something-blah.esm.js, dist/something-blah.worker.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    ⎯ symlink to src/index.js
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
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.js.flow ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    // @flow
    export * from "../src/index.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    ⎯ symlink to src/index.js
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
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

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
        entrypoints: ["index.ts", "something.tsx"],
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
    "packages/pkg-a/src/something.tsx": ts`
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
  await fsEnsureSymlink(
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
    export { _default as default } from "./pkg-a.cjs.default.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQubXRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index.js";
    export { default } from "../src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.default.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { default as _default } from "../src/index.js"

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.default.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    exports._default = require("./pkg-a.cjs.js").default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./pkg-a.cjs.js";
    export { _default as default } from "./pkg-a.cjs.default.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    ⎯ symlink to packages/pkg-a/src/index.ts
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../../src/something.js";
    export { _default as default } from "./pkg-a-something.cjs.default.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEtc29tZXRoaW5nLmNqcy5kLm10cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zb21ldGhpbmcudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../../src/something.js";
    export { default } from "../../src/something.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEtc29tZXRoaW5nLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3NvbWV0aGluZy50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.default.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { default as _default } from "../../src/something.js"

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.default.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    exports._default = require("./pkg-a-something.cjs.js").default;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./pkg-a-something.cjs.js";
    export { _default as default } from "./pkg-a-something.cjs.default.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/something/dist/pkg-a-something.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    ⎯ symlink to packages/pkg-a/src/something.tsx
  `);
});

test("imports conditions", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/pkg",
      preconstruct: {
        exports: {
          importConditionDefaultExport: "default",
        },
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
        },
      },
      imports: {
        "#is-development": {
          development: "./src/true.js",
          default: "./src/false.js",
        },
        "#is-browser": {
          worker: "./src/false.js",
          browser: "./src/true.js",
          default: "./src/false.js",
        },
        "#something": {
          "condition-should-never-appear-anywhere": "./src/true.js",
          default: "./src/true.js",
        },
      },
      main: "dist/scope-pkg.cjs.js",
      module: "dist/scope-pkg.esm.js",
      exports: {
        ".": {
          types: {
            import: "./dist/scope-pkg.cjs.mjs",
            default: "./dist/scope-pkg.cjs.js",
          },
          development: {
            worker: {
              module: "./dist/scope-pkg.development.esm.js",
              import: "./dist/scope-pkg.development.cjs.mjs",
              default: "./dist/scope-pkg.development.cjs.js",
            },
            browser: {
              module: "./dist/scope-pkg.browser.development.esm.js",
              import: "./dist/scope-pkg.browser.development.cjs.mjs",
              default: "./dist/scope-pkg.browser.development.cjs.js",
            },
            module: "./dist/scope-pkg.development.esm.js",
            import: "./dist/scope-pkg.development.cjs.mjs",
            default: "./dist/scope-pkg.development.cjs.js",
          },
          worker: {
            module: "./dist/scope-pkg.esm.js",
            import: "./dist/scope-pkg.cjs.mjs",
            default: "./dist/scope-pkg.cjs.js",
          },
          browser: {
            module: "./dist/scope-pkg.browser.esm.js",
            import: "./dist/scope-pkg.browser.cjs.mjs",
            default: "./dist/scope-pkg.browser.cjs.js",
          },
          module: "./dist/scope-pkg.esm.js",
          import: "./dist/scope-pkg.cjs.mjs",
          default: "./dist/scope-pkg.cjs.js",
        },
        "./package.json": "./package.json",
      },
    }),
    "src/index.js": js`
      export {};
    `,
  });
  await dev(dir);
  const maybeRelativePathFromTestDirToPreconstructDir = normalizePath(
    path.relative(dir, repoRoot)
  );
  expect(
    await getFiles(dir, ["dist/**"], {
      transformContent(content) {
        return content
          .replace(
            maybeRelativePathFromTestDirToPreconstructDir,
            "<maybe-relative-from-testdir-to-preconstruct-dir>"
          )
          .replace(
            "../<maybe-relative-from-testdir-to-preconstruct-dir>",
            "<maybe-relative-from-testdir-to-preconstruct-dir>"
          );
      },
    })
  ).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.cjs.js, dist/scope-pkg.browser.development.cjs.js, dist/scope-pkg.cjs.js, dist/scope-pkg.development.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    "use strict";
    // this file might look strange and you might be wondering what it's for
    // it's lets you import your source files by importing this entrypoint
    // as you would import it if it was built with preconstruct build
    // this file is slightly different to some others though
    // it has a require hook which compiles your code with Babel
    // this means that you don't have to set up @babel/register or anything like that
    // but you can still require this module and it'll be compiled

    // this bit of code imports the require hook and registers it
    let unregister = require("<maybe-relative-from-testdir-to-preconstruct-dir>/packages/hook").___internalHook(typeof __dirname === 'undefined' ? undefined : __dirname, "..", "..");

    // this re-exports the source file
    module.exports = require("../src/index.js");

    unregister();

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./dist/scope-pkg.browser.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.development.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./dist/scope-pkg.browser.development.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.development.esm.js, dist/scope-pkg.browser.esm.js, dist/scope-pkg.development.esm.js, dist/scope-pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    ⎯ symlink to src/index.js
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./dist/scope-pkg.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.development.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./dist/scope-pkg.development.cjs.js";

  `);
});

test("dev command entrypoint", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      preconstruct: {
        entrypoints: ["something.ts"],
      },
    }),
    "something/package.json": JSON.stringify({
      main: "dist/pkg-something.cjs.js",
      module: "dist/pkg-something.esm.js",
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    "src/something.ts": js`
      const a: string = "message from something";
      console.log(a);
    `,
  });

  await dev(tmpPath);

  // i would require it but i don't want jest to do magical things
  let { code, stdout, stderr } = await spawn("node", [
    path.join(tmpPath, "something"),
  ]);
  expect(stderr.toString()).toBe("");
  expect(stdout.toString().split("\n")).toEqual(["message from something", ""]);
  expect(code).toBe(0);
});

test("multiple entrypoints", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "multiple-entrypoints",
      main: "dist/multiple-entrypoints.cjs.js",
      module: "dist/multiple-entrypoints.esm.js",
      exports: {
        ".": {
          types: {
            import: "./dist/multiple-entrypoints.cjs.mjs",
            default: "./dist/multiple-entrypoints.cjs.js",
          },
          module: "./dist/multiple-entrypoints.esm.js",
          import: "./dist/multiple-entrypoints.cjs.mjs",
          default: "./dist/multiple-entrypoints.cjs.js",
        },
        "./multiply": {
          types: {
            import: "./dist/multiple-entrypoints-multiply.cjs.mjs",
            default: "./dist/multiple-entrypoints-multiply.cjs.js",
          },
          module: "./dist/multiple-entrypoints-multiply.esm.js",
          import: "./dist/multiple-entrypoints-multiply.cjs.mjs",
          default: "./dist/multiple-entrypoints-multiply.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: {
          importConditionDefaultExport: "default",
        },
        entrypoints: ["index.ts", "multiply.ts"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
          distInRoot: true,
        },
      },
    }),
    "multiply/package.json": JSON.stringify({
      main: "../dist/multiple-entrypoints-multiply.cjs.js",
      module: "../dist/multiple-entrypoints-multiply.esm.js",
    }),
    "src/index.ts": js`
      export let sum = (a, b) => a + b;
      export default "a";
    `,
    "src/multiply.ts": js`
      export let multiply = (a, b) => a * b;
    `,
    "something.js": js`
      const { multiply } = require("multiple-entrypoints/multiply");
      console.log(multiply(2, 2) + "");
    `,
  });

  await dev(dir);

  let { code, stdout, stderr } = await spawn("node", [
    path.join(dir, "something"),
  ]);
  expect(stderr.toString()).toBe("");
  expect(stdout.toString().split("\n")).toEqual(["4", ""]);
  expect(code).toBe(0);
});

test("type: module", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "multiple-entrypoints",
      type: "module",
      exports: {
        ".": "./dist/multiple-entrypoints.js",
        "./multiply": "./dist/multiple-entrypoints-multiply.js",
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: true,
        entrypoints: ["index.ts", "multiply.ts"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
          distInRoot: true,
          typeModule: true,
        },
      },
    }),
    "src/index.ts": js`
      export let a = "a";
    `,
    "src/multiply.ts": js`
      export let b = "b";
    `,
  });

  await dev(dir);

  expect(await getFiles(dir, ["**/dist/**/*"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints-multiply.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/multiply.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlwbGUtZW50cnlwb2ludHMtbXVsdGlwbHkuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tdWx0aXBseS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints-multiply.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    ⎯ symlink to src/multiply.ts
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlwbGUtZW50cnlwb2ludHMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    ⎯ symlink to src/index.ts
  `);
});

test("type: module running", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "multiple-entrypoints",
      type: "module",
      exports: {
        ".": "./dist/multiple-entrypoints.js",
        "./multiply": "./dist/multiple-entrypoints-multiply.js",
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: true,
        entrypoints: ["index.js", "multiply.js"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
          distInRoot: true,
          typeModule: true,
        },
      },
    }),
    "src/index.js": js`
      export let a = "a";
    `,
    "src/multiply.js": js`
      export let b = "b";
    `,
    "runtime-blah.mjs": js`
      import { b } from "multiple-entrypoints/multiply";
      console.log(b);
    `,
  });

  await dev(dir);

  let { code, stdout, stderr } = await spawn("node", [
    path.join(dir, "runtime-blah.mjs"),
  ]);
  expect(stderr.toString()).toBe("");
  expect(stdout.toString().split("\n")).toEqual(["b", ""]);
  expect(code).toBe(0);
});

test(".d.ts", async () => {
  let tmpPath = await testdir({
    "tsconfig.json": typescriptFixture["tsconfig.json"],
    ".babelrc": typescriptFixture[".babelrc"],
    node_modules: typescriptFixture.node_modules,
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
      exports: {
        ".": {
          module: "./dist/pkg.esm.js",
          import: "./dist/pkg.cjs.mjs",
          default: "./dist/pkg.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "src/index.js": ts`
      export const a = "a";
      export default a;
    `,
    "src/index.d.ts": ts`
      export const a: string;
      export default a;
    `,
  });
  await dev(tmpPath);
  expect(await getFiles(tmpPath, ["dist/**.d.{,m}ts"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index.js";
    export { _default as default } from "./pkg.cjs.default.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLmNqcy5kLm10cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "../src/index.js";
    export { default } from "../src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/pkg.cjs.default.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { default as _default } from "../src/index.js"

  `);
});
