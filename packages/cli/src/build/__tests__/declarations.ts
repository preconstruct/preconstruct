import path from "path";
import build from "..";
import {
  testdir as testdirWithNextMajorDefaults,
  testdirWithLegacyPreconstructDefaults as testdir,
  typescriptFixture,
  getDist,
  getFiles,
  ts,
  repoNodeModules,
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
        export { thing } from "./index.js";
        export declare function blah(): void;

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        export { blah } from "./a.js";
        export declare function thing(): void;

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        export * from "./declarations/src/index.js";
        //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGUtdGVzdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
        //#region src/a.ts
        function blah() {}
        //#endregion
        //#region src/index.ts
        function thing() {}
        //#endregion
        exports.blah = blah;
        exports.thing = thing;

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        //#region src/a.ts
        function blah() {}
        //#endregion
        //#region src/index.ts
        function thing() {}
        //#endregion
        export { blah, thing };
      `);
});

const onlyEmitUsedDeclsBasic = {
  "package.json": JSON.stringify({
    name: "@scope/test",
    main: "dist/scope-test.cjs.js",
    module: "dist/scope-test.esm.js",
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
        export * from "./declarations/src/index.js";
        //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGUtdGVzdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=
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
        export * from "./declarations/src/index.js";
        //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGUtdGVzdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=
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
  export * from "./declarations/src/index.js";
  //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGUtdGVzdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=
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
  export * from "./declarations/src/index.js";
  //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGUtdGVzdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=
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
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGUtdGVzdC5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=
    `);
});

test("replaces ts extensions in module specifiers within generated declarations with imports", async () => {
  let dir = await testdirWithNextMajorDefaults({
    "package.json": JSON.stringify({
      name: "@explicit-ts-extensions/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
        exports: {},
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
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9
    `);
});

test("replaces ts extensions in module specifiers within generated declarations with onlyEmitUsedTypeScriptDeclarations", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@explicit-ts-extensions/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
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
        export * from "./declarations/src/index.js";
        //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9
      `);
});

test('doesn\'t replace ts "extensions" in module specifiers that are only parts of the actual filenames and not their extensions', async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@explicit-ts-extensions/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
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
  export * from "./declarations/src/index.js";
  //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9
`);
});

test("replaces declaration extensions with their runtime counterparts", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@explicit-dts-extension/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
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
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9
    `);
});

test("replaces package.json#imports in declaration files without importConditions flags", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@imports-replacing/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      imports: {
        "#hidden": "./src/hidden_stuff.ts",
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export { gem } from "#hidden";
    `,
    "packages/pkg-a/src/hidden_stuff.ts": ts`
      export const gem = "🎁";
    `,
    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node16",
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.*"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/hidden_stuff.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const gem = "\\uD83C\\uDF81";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { gem } from "./hidden_stuff.js";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9
    `);
});

test("normalises imports in manually authored .d.ts files", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@imports-replacing/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      imports: {
        "#hidden": "./src/hidden_stuff.ts",
      },
    }),
    "packages/pkg-a/src/index.js": ts`
      export { gem } from "#hidden";
    `,
    "packages/pkg-a/src/index.d.ts": ts`
      export { gem } from "#hidden";
      export type A = typeof import(/** comment */ "#hidden").gem;
      export type B = typeof import(/* non-jsdoc comment */ "./hidden_stuff").gem;
      export type C = typeof import("./hidden_stuff.ts").gem;
    `,
    "packages/pkg-a/src/hidden_stuff.ts": ts`
      export const gem = "🎁";
    `,
    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node16",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.*"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/hidden_stuff.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const gem = "\\uD83C\\uDF81";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { gem } from "./hidden_stuff.js";
      export type A = typeof import(/** comment */ "./hidden_stuff.js").gem;
      export type B = typeof import(/* non-jsdoc comment */ "./hidden_stuff.js").gem;
      export type C = typeof import("./hidden_stuff.js").gem;
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9
    `);
});

test("normalises imports in manually authored .d.cts files", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@imports-replacing/repo",
      preconstruct: {
        packages: ["packages/pkg-a"],
      },
    }),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      imports: {
        "#hidden": "./src/hidden_stuff.cjs",
      },
    }),
    "packages/pkg-a/src/index.js": ts`
    `,
    "packages/pkg-a/src/index.d.ts": ts`
      export type A = typeof import(/** comment */ "#hidden").gem;
      export type B = typeof import(/* non-jsdoc comment */ "./hidden_stuff.cjs").gem;
      export type C = typeof import("./hidden_stuff.cjs").gem;
    `,
    "packages/pkg-a/src/hidden_stuff.cjs": ts`
      export const gem = "🎁";
    `,
    "packages/pkg-a/src/hidden_stuff.d.cts": ts`
      export const gem = "🎁";
    `,
    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node16",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["packages/*/dist/**/*.d.*"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/hidden_stuff.d.cts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export const gem = "🎁";
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export type A = typeof import(/** comment */ "./hidden_stuff.js").gem;
      export type B = typeof import(/* non-jsdoc comment */ "./hidden_stuff.js").gem;
      export type C = typeof import("./hidden_stuff.js").gem;
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/dist/pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9
    `);
});

test("self-import", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      preconstruct: {
        entrypoints: ["index.ts", "b.ts"],
      },
    }),
    "b/package.json": JSON.stringify({
      main: "dist/a-b.cjs.js",
      module: "dist/a-b.esm.js",
    }),
    "src/index.ts": ts`
      export const gem = "🎁";
    `,
    "src/b.ts": ts`
      export { gem } from "a";
      export const b = "b";
    `,

    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node16",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["{b/dist,dist}/**/*.d.*"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ b/dist/a-b.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../../dist/declarations/src/b.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS1iLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vZGlzdC9kZWNsYXJhdGlvbnMvc3JjL2IuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/b.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { gem } from "a";
      export declare const b = "b";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const gem = "\\uD83C\\uDF81";
    `);
});

test("self-import with exports field", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        "./b": {
          module: "./b/dist/a-b.esm.js",
          default: "./b/dist/a-b.cjs.js",
        },
        ".": {
          module: "./dist/a.esm.js",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts", "b.ts"],
        exports: true,
      },
    }),
    "b/package.json": JSON.stringify({
      main: "dist/a-b.cjs.js",
      module: "dist/a-b.esm.js",
    }),
    "src/index.ts": ts`
      export const gem = "🎁";
    `,
    "src/b.ts": ts`
      export { gem } from "a";
      export const b = "b";
    `,

    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node16",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["{b/dist,dist}/**/*.d.*"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ b/dist/a-b.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../../dist/declarations/src/b.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS1iLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vZGlzdC9kZWNsYXJhdGlvbnMvc3JjL2IuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/b.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { gem } from "../dist/a.cjs.js";
      export declare const b = "b";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const gem = "\\uD83C\\uDF81";
    `);
});

test("self-import with exports field and importConditionDefaultExport: default", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        "./b": {
          module: "./b/dist/a-b.esm.js",
          import: "./b/dist/a-b.cjs.mjs",
          default: "./b/dist/a-b.cjs.js",
        },
        ".": {
          module: "./dist/a.esm.js",
          import: "./dist/a.cjs.mjs",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts", "b.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "b/package.json": JSON.stringify({
      main: "dist/a-b.cjs.js",
      module: "dist/a-b.esm.js",
    }),
    "src/index.ts": ts`
      export const gem = "🎁";
    `,
    "src/b.ts": ts`
      export { gem } from "a";
      export const b = "b";
    `,

    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "node16",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["{b/dist,dist}/**/*.d.*"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ b/dist/a-b.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../../dist/declarations/src/b.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS1iLmNqcy5kLm10cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2Rpc3QvZGVjbGFyYXRpb25zL3NyYy9iLmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ b/dist/a-b.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../../dist/declarations/src/b.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS1iLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vZGlzdC9kZWNsYXJhdGlvbnMvc3JjL2IuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC5tdHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/b.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { gem } from "../dist/a.cjs.js";
      export declare const b = "b";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const gem = "\\uD83C\\uDF81";
    `);
});

test("self-import with exports field and importConditionDefaultExport: defaul and moduleResolution: bundler", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        "./b": {
          module: "./b/dist/a-b.esm.js",
          import: "./b/dist/a-b.cjs.mjs",
          default: "./b/dist/a-b.cjs.js",
        },
        ".": {
          module: "./dist/a.esm.js",
          import: "./dist/a.cjs.mjs",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        entrypoints: ["index.ts", "b.ts"],
        exports: {
          importConditionDefaultExport: "default",
        },
      },
    }),
    "b/package.json": JSON.stringify({
      main: "dist/a-b.cjs.js",
      module: "dist/a-b.esm.js",
    }),
    "src/index.ts": ts`
      export const gem = "🎁";
    `,
    "src/b.ts": ts`
      export { gem } from "a";
      export const b = "b";
    `,

    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["{b/dist,dist}/**/*.d.*"]))
    .toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ b/dist/a-b.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../../dist/declarations/src/b.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS1iLmNqcy5kLm10cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2Rpc3QvZGVjbGFyYXRpb25zL3NyYy9iLmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ b/dist/a-b.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../../dist/declarations/src/b.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS1iLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vZGlzdC9kZWNsYXJhdGlvbnMvc3JjL2IuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC5tdHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "./declarations/src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/dist/a.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export * from "../src/index.js";
      //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC5tdHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/b.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export { gem } from "../dist/a.cjs.js";
      export declare const b = "b";

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      export declare const gem = "\\uD83C\\uDF81";
    `);
});

test("importing json where json import is emitted in declaration files", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        ".": {
          module: "./dist/a.esm.js",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
    }),

    "src/index.ts": ts`
      import json from "./b.json";

      export { json };
    `,
    "src/b.json": JSON.stringify({ something: "a" }),

    node_modules: typescriptFixture.node_modules,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);

  expect(await getFiles(dir, ["dist/**/*"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    //#region src/b.json
    var b_default = { something: "a" };
    //#endregion
    Object.defineProperty(exports, "json", {
    	enumerable: true,
    	get: function() {
    		return b_default;
    	}
    });

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    //#region src/b.json
    var b_default = { something: "a" };
    //#endregion
    export { b_default as json };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/b.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"something":"a"}
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import json from "./b.json";
    export { json };
  `);
});

test("type dep missing", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        ".": {
          module: "./dist/a.esm.js",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          checkTypeDependencies: true,
        },
      },
    }),

    "src/index.ts": ts`
      export type { a } from "something";
    `,
    "node_modules/typescript": {
      kind: "symlink",
      path: path.join(repoNodeModules, "typescript"),
    },
    "node_modules/something/index.js": "export const a = 'blah';",
    "node_modules/something/index.d.ts": "export const a = 'blah';",
    "node_modules/something/package.json": JSON.stringify({
      name: "something",
      main: "index.js",
    }),
    ".babelrc": typescriptFixture[".babelrc"],
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await expect(build(dir)).rejects.toMatchInlineSnapshot(
    `
    [Error: 🎁 a Error: Build failed with 1 error:
    🎁 a
    🎁 a [plugin typescript-declarations]
    🎁 a Error: dependency "something" used by types for src/index.ts is not declared in dependencies or peerDependencies
    🎁 a     at checkTypeImportDeclaredInDeps (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/get-declarations-with-imported-module-specifiers-replacing.ts:40:11)
    🎁 a     at handleImport (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/get-declarations-with-imported-module-specifiers-replacing.ts:78:11)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:84:41
    🎁 a     at visitor (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:292:32)
    🎁 a     at visitArrayWorker (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85435:51)
    🎁 a     at visitNodes2 (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85406:21)
    🎁 a     at visitLexicalEnvironment (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85462:18)
    🎁 a     at visitEachChildOfSourceFile (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:86645:13)
    🎁 a     at Object.visitEachChild (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85623:35)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:302:29
    🎁 a     at transformation (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:108883:16)
    🎁 a     at transformRoot (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:108906:73)
    🎁 a     at transformNodes (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:108891:72)
    🎁 a     at emitDeclarationFileOrBundle (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109529:36)
    🎁 a     at emitSourceFileOrBundle (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109416:7)
    🎁 a     at forEachEmittedFile (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109167:26)
    🎁 a     at emitFiles (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109387:5)
    🎁 a     at emitWorker (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116758:26)
    🎁 a     at /Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116743:53
    🎁 a     at runWithCancellationToken (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116832:16)
    🎁 a     at Object.emit (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116743:22)
    🎁 a     at getDeclarationsForFile (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:249:35)
    🎁 a     at getDeclarationsWithImportedModuleSpecifiersReplacing (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/get-declarations-with-imported-module-specifiers-replacing.ts:112:20)
    🎁 a     at PluginContextImpl.generateBundle (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/index.ts:102:28)
    🎁 a     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1707:4)
    🎁 a     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:12)
    🎁 a     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
    🎁 a     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
    🎁 a     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
    🎁 a     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
    🎁 a     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
    🎁 a     at build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/declarations.ts:981:3
    🎁 a     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
    🎁 a   errors: [Getter/Setter]
    🎁 a }]
  `
  );
});

test("@types/ dep missing", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        ".": {
          module: "./dist/a.esm.js",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          checkTypeDependencies: true,
        },
      },
    }),

    "src/index.ts": ts`
      export type { a } from "something";
    `,
    ".babelrc": typescriptFixture[".babelrc"],
    "node_modules/typescript": {
      kind: "symlink",
      path: path.join(repoNodeModules, "typescript"),
    },
    "node_modules/something/index.js": "export const a = 'blah';",
    "node_modules/something/package.json": JSON.stringify({
      name: "something",
      main: "index.js",
    }),
    "node_modules/@types/something/index.d.ts": "export const a = 'blah';",
    "node_modules/@types/something/package.json": JSON.stringify({
      name: "something",
      main: "index.js",
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await expect(build(dir)).rejects.toMatchInlineSnapshot(
    `
    [Error: 🎁 a Error: Build failed with 1 error:
    🎁 a
    🎁 a [plugin typescript-declarations]
    🎁 a Error: dependency "@types/something" used by types for src/index.ts is not declared in dependencies or peerDependencies
    🎁 a     at checkTypeImportDeclaredInDeps (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/get-declarations-with-imported-module-specifiers-replacing.ts:40:11)
    🎁 a     at handleImport (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/get-declarations-with-imported-module-specifiers-replacing.ts:78:11)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:84:41
    🎁 a     at visitor (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:292:32)
    🎁 a     at visitArrayWorker (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85435:51)
    🎁 a     at visitNodes2 (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85406:21)
    🎁 a     at visitLexicalEnvironment (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85462:18)
    🎁 a     at visitEachChildOfSourceFile (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:86645:13)
    🎁 a     at Object.visitEachChild (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:85623:35)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:302:29
    🎁 a     at transformation (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:108883:16)
    🎁 a     at transformRoot (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:108906:73)
    🎁 a     at transformNodes (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:108891:72)
    🎁 a     at emitDeclarationFileOrBundle (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109529:36)
    🎁 a     at emitSourceFileOrBundle (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109416:7)
    🎁 a     at forEachEmittedFile (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109167:26)
    🎁 a     at emitFiles (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:109387:5)
    🎁 a     at emitWorker (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116758:26)
    🎁 a     at /Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116743:53
    🎁 a     at runWithCancellationToken (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116832:16)
    🎁 a     at Object.emit (/Users/emma/projects/preconstruct/node_modules/typescript/lib/typescript.js:116743:22)
    🎁 a     at getDeclarationsForFile (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:249:35)
    🎁 a     at getDeclarationsWithImportedModuleSpecifiersReplacing (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/get-declarations-with-imported-module-specifiers-replacing.ts:112:20)
    🎁 a     at PluginContextImpl.generateBundle (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/index.ts:102:28)
    🎁 a     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1707:4)
    🎁 a     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:12)
    🎁 a     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
    🎁 a     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
    🎁 a     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
    🎁 a     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
    🎁 a     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
    🎁 a     at build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
    🎁 a     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/declarations.ts:1077:3
    🎁 a     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
    🎁 a   errors: [Getter/Setter]
    🎁 a }]
  `
  );
});

test("type dep not missing", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        ".": {
          module: "./dist/a.esm.js",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          checkTypeDependencies: true,
        },
      },
      dependencies: {
        something: "1.0.0",
      },
    }),

    "src/index.ts": ts`
      export type { a } from "something";
    `,
    "node_modules/typescript": {
      kind: "symlink",
      path: path.join(repoNodeModules, "typescript"),
    },
    "node_modules/something/index.js": "export const a = 'blah';",
    "node_modules/something/index.d.ts": "export const a = 'blah';",
    "node_modules/something/package.json": JSON.stringify({
      name: "something",
      main: "index.js",
    }),
    ".babelrc": typescriptFixture[".babelrc"],
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**/*.d.*"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type { a } from "something";

  `);
});

test("type dep not used", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "a",
      main: "dist/a.cjs.js",
      module: "dist/a.esm.js",
      exports: {
        ".": {
          module: "./dist/a.esm.js",
          default: "./dist/a.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          checkTypeDependencies: true,
        },
      },
      dependencies: {
        something: "1.0.0",
      },
    }),

    "src/index.ts": ts`
      import { a } from "something";
      export const b = a;
    `,
    ".babelrc": typescriptFixture[".babelrc"],
    "node_modules/typescript": {
      kind: "symlink",
      path: path.join(repoNodeModules, "typescript"),
    },
    "node_modules/something/index.js": "export const a = 'blah';",
    "node_modules/something/package.json": JSON.stringify({
      name: "something",
      main: "index.js",
    }),
    "node_modules/@types/something/index.d.ts": "export const a = 'blah';",
    "node_modules/@types/something/package.json": JSON.stringify({
      name: "something",
      main: "index.js",
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        strict: true,
        declaration: true,
      },
    }),
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**/*.d.*"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const b = "blah";

  `);
});
