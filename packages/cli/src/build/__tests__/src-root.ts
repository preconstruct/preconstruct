import build from "../";
import {
  testdirWithLegacyPreconstructDefaults as testdir,
  getDist,
  ts,
  repoNodeModules,
} from "../../../test-utils";


test("monorepo with root src dir and typescript package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "root",
      devDependencies: {
        typescript: "^3.8.3",
      },
      preconstruct: {
        packages: ["src/packages/*"],
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [
        require.resolve("@babel/preset-env"),
        require.resolve("@babel/preset-typescript"),
      ],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "src/packages/my-package/package.json": JSON.stringify({
      name: "my-package",
      main: "dist/my-package.cjs.js",
      module: "dist/my-package.esm.js",
    }),
    "src/packages/my-package/tsconfig.json": `{
    "compilerOptions": {
      "target": "esnext",
      "module": "commonjs",
      "outDir": "./build/cjs",
      "declarationDir": "./build/types",
      "isolatedModules": true,
      "esModuleInterop": true,
      "noEmit": true
    }
  }
  `,

    "src/packages/my-package/src/index.ts": ts`
      export default {};
    `,
  });

  await build(tmpPath);

  expect(await getDist(tmpPath + "/src/packages/my-package"))
    .toMatchInlineSnapshot(`
        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        declare const _default: {};
        export default _default;

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/my-package.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        export * from "./declarations/src/index.js";
        export { default } from "./declarations/src/index.js";
        //# sourceMa${""}ppingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXktcGFja2FnZS5janMuZC50cyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4vZGVjbGFyYXRpb25zL3NyYy9pbmRleC5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBIn0=

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/my-package.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        Object.defineProperties(exports, {
        	__esModule: { value: true },
        	[Symbol.toStringTag]: { value: "Module" }
        });
        //#region src/index.ts
        var src_default = {};
        //#endregion
        exports.default = src_default;

        ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/my-package.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
        //#region src/index.ts
        var src_default = {};
        //#endregion
        export { src_default as default };
      `);
});
