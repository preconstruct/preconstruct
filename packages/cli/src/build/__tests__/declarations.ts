import build from "..";
import {
  testdir,
  typescriptFixture,
  getDist,
  getFiles,
  ts,
} from "../../../test-utils";

test("circular dependency typescript", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
      module: "dist/scope-test.esm.js",
    }),
    "tsconfig.json": typescriptFixture["tsconfig.json"],
    node_modules: typescriptFixture.node_modules,
    "src/index.ts": ts`
      export { blah } from "./a";
      export function thing() {}
    `,
    "src/a.ts": ts`
      export { thing } from "./index";
      export function blah() {}
    `,
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/a.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { thing } from "./index";
    export declare function blah(): void;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { blah } from "./a";
    export declare function thing(): void;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-test.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"scope-test.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.dev.js, dist/scope-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function blah() {}

    function thing() {}

    exports.blah = blah;
    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./scope-test.cjs.prod.js");
    } else {
      module.exports = require("./scope-test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    function blah() {}

    function thing() {}

    export { blah, thing };

  `);
});

const onlyEmitUsedDeclsBasic = {
  "package.json": JSON.stringify({
    name: "@scope/test",
    main: "dist/scope-test.cjs.js",
    module: "dist/scope-test.esm.js",
    preconstruct: {
      ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
        onlyEmitUsedTypeScriptDeclarations: true,
      },
    },
  }),
  "tsconfig.json": typescriptFixture["tsconfig.json"],
  node_modules: typescriptFixture.node_modules,
  ".babelrc": JSON.stringify({
    presets: [require.resolve("@babel/preset-typescript")],
  }),
};

test("onlyEmitUsedTypeScriptDeclarations", async () => {
  let dir = await testdir({
    ...onlyEmitUsedDeclsBasic,
    "src/index.ts": ts`
      import { A } from "./other";
      export function thing(): A {
        return { something: true };
      }
    `,
    "src/other.ts": ts`
      export type A = { something: true };
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**/*.d.ts"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import { A } from "./other.js";
    export declare function thing(): A;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/other.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type A = {
        something: true;
    };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-test.cjs.d.ts.map

  `);
});

test("onlyEmitUsedTypeScriptDeclarations with unused", async () => {
  let dir = await testdir({
    ...onlyEmitUsedDeclsBasic,
    "src/index.ts": ts`
      import { A } from "./other";

      function a(): A {
        return { something: true };
      }

      console.log(a());
      export function thing() {}
    `,
    "src/other.ts": ts`
      export type A = { something: true };
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**/*.d.ts"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare function thing(): void;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-test.cjs.d.ts.map

  `);
});

test("onlyEmitUsedTypeScriptDeclarations with export from", async () => {
  let dir = await testdir({
    ...onlyEmitUsedDeclsBasic,
    "src/index.ts": ts`
      export type { A } from "./other";
    `,
    "src/other.ts": ts`
      export type A = { something: true };
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**/*.d.ts"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type { A } from "./other.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/other.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type A = {
        something: true;
    };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-test.cjs.d.ts.map

  `);
});

test("onlyEmitUsedTypeScriptDeclarations with inline import type", async () => {
  let dir = await testdir({
    ...onlyEmitUsedDeclsBasic,
    "src/index.ts": ts`
      export function a(): import("./other").A {
        return { something: true };
      }
    `,
    "src/other.ts": ts`
      export type A = { something: true };
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**/*.d.ts"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare function a(): import("./other.js").A;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/other.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type A = {
        something: true;
    };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-test.cjs.d.ts.map

  `);
});

test("onlyEmitUsedTypeScriptDeclarations with import x = require('')", async () => {
  let dir = await testdir({
    ...onlyEmitUsedDeclsBasic,
    "src/index.ts": ts`
      declare namespace something {
        export import x = require("./other");
      }
      export function a(): something.x.A {
        return { something: true };
      }
    `,
    "src/other.ts": ts`
      export type A = { something: true };
    `,
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**/*.d.ts"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    declare namespace something {
        export import x = require("./other.js");
    }
    export declare function a(): something.x.A;
    export {};

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/other.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type A = {
        something: true;
    };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-test.cjs.d.ts.map

  `);
});

test("replaces ts extensions in module specifiers within generated declarations with importsConditions", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@explicit-ts-extensions/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
        exports: {},
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
        },
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      exports: {
        ".": {
          types: "./dist/pkg-a.cjs.js",
          module: "./dist/pkg-a.esm.js",
          default: "./dist/pkg-a.cjs.js",
        },
        "./package.json": "./package.json",
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export { fromTsExt } from "./foo.ts";
    `,
    "packages/pkg-a/src/foo.ts": ts`
      export const fromTsExt = 1;
    `,
    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.*"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/foo.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const fromTsExt = 1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { fromTsExt } from "./foo.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

  `);
});

test("replaces ts extensions in module specifiers within generated declarations with onlyEmitUsedTypeScriptDeclarations", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@explicit-ts-extensions/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          onlyEmitUsedTypeScriptDeclarations: true,
        },
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export { fromTsExt } from "./foo.ts";
    `,
    "packages/pkg-a/src/foo.ts": ts`
      export const fromTsExt = 1;
    `,
    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.*"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/foo.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const fromTsExt = 1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { fromTsExt } from "./foo.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

  `);
});

test('doesn\'t replace ts "extensions" in module specifiers that are only parts of the actual filenames and not their extensions', async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@explicit-ts-extensions/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          onlyEmitUsedTypeScriptDeclarations: true,
        },
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export { fromPseudoTsExt } from "./foo.ts";
    `,
    "packages/pkg-a/src/foo.ts.ts": ts`
      export const fromPseudoTsExt = 1;
    `,
    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.*"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/foo.ts.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const fromPseudoTsExt = 1;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { fromPseudoTsExt } from "./foo.ts.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

  `);
});

test("replaces declaration extensions with their runtime counterparts", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@explicit-dts-extension/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          onlyEmitUsedTypeScriptDeclarations: true,
        },
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
    }),
    "packages/pkg-a/src/index.ts": ts`
      export type { DtsExt } from "./types.d.ts";
    `,
    "packages/pkg-a/src/types.d.ts": ts`
      export type DtsExt = 1;
    `,
    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node",
        strict: true,
        declaration: true,
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.*"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type { DtsExt } from "./types.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/types.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type DtsExt = 1;
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=pkg-a.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"pkg-a.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

  `);
});
