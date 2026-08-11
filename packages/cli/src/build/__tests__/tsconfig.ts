import assert from "node:assert/strict";
import path from "path";
import build from "..";
import { testdir, ts, repoNodeModules, getFiles } from "../../../test-utils";

jest.setTimeout(6000000);

test("should build with custom tsconfig filename in standalone package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "typescript-custom-config",
      main: "dist/typescript-custom-config.cjs.js",
      module: "dist/typescript-custom-config.esm.js",
      dependencies: {
        "@babel/runtime": "^7.8.7",
      },
      devDependencies: {
        typescript: "^3.8.3",
      },
      preconstruct: {
        tsconfig: "tsconfig.build.json",
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "tsconfig.build.json": JSON.stringify({
      compilerOptions: {
        module: "commonjs",
        moduleResolution: "node",
        jsx: "react",
        declaration: true,
        isolatedModules: true,
        strict: true,
        esModuleInterop: true,
        noEmit: true,
      },
    }),
    "src/index.ts": ts`
      export const thing = "custom-config" as const;
    `,
  });
  await build(tmpPath);
  expect(await getFiles(path.join(tmpPath, "dist"))).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const thing: "custom-config";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ typescript-custom-config.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC1jdXN0b20tY29uZmlnLmNqcy5kLnRzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi9kZWNsYXJhdGlvbnMvc3JjL2luZGV4LmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ typescript-custom-config.cjs.dev.js, typescript-custom-config.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const thing = "custom-config";

    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ typescript-custom-config.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./typescript-custom-config.cjs.prod.js");
    } else {
      module.exports = require("./typescript-custom-config.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ typescript-custom-config.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = "custom-config";

    export { thing };

  `);
});

test("should fail to build with invalid custom tsconfig filename in standalone package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "typescript-invalid-custom-config",
      main: "dist/typescript-invalid-custom-config.cjs.js",
      module: "dist/typescript-invalid-custom-config.esm.js",
      dependencies: {
        "@babel/runtime": "^7.8.7",
      },
      devDependencies: {
        typescript: "^3.8.3",
      },
      preconstruct: {
        tsconfig: "tsconfig.invalid.json",
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "tsconfig.build.json": JSON.stringify({
      compilerOptions: {
        target: "esnext",
        module: "esnext",
        jsx: "react",
        isolatedModules: true,
        strict: true,
        moduleResolution: "node",
        esModuleInterop: true,
        noEmit: true,
      },
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          module: "nodenext",
          moduleResolution: "nodenext",
          jsx: "react",
          declaration: true,
          isolatedModules: true,
          strict: true,
          esModuleInterop: true,
          noEmit: true,
        },
      }),
    }),
    "src/index.ts": ts`
      export const thing = "custom-invalid-config" as const;
    `,
  });
  await expect(build(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: 🎁 typescript-invalid-custom-config the custom TypeScript config file tsconfig.invalid.json does not exist.]`
  );
});

test("should build with custom tsconfig filename in monorepo package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-root",
      private: true,
      workspaces: ["packages/*"],
      devDependencies: {
        typescript: "^3.8.3",
      },
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      preconstruct: {
        tsconfig: "tsconfig.build.json",
      },
    }),
    "packages/pkg-a/tsconfig.build.json": JSON.stringify({
      compilerOptions: {
        module: "commonjs",
        jsx: "react",
        declaration: true,
        isolatedModules: true,
        strict: true,
        moduleResolution: "node",
        esModuleInterop: true,
        noEmit: true,
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "monorepo-custom-config";
    `,
  });
  await build(tmpPath);
  expect(await getFiles(path.join(tmpPath, "packages/pkg-a/dist")))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const thing = "monorepo-custom-config";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.cjs.dev.js, pkg-a.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const thing = "monorepo-custom-config";

    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg-a.cjs.prod.js");
    } else {
      module.exports = require("./pkg-a.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = "monorepo-custom-config";

    export { thing };

  `);
});

test("should build a monorepo package with custom tsconfig located in a relative folder", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-root",
      private: true,
      workspaces: ["packages/*"],
      devDependencies: {
        typescript: "^3.8.3",
      },
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      preconstruct: {
        tsconfig: "./folder/tsconfig.json",
      },
    }),
    "packages/pkg-a/folder/tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "commonjs",
        jsx: "react",
        declaration: true,
        isolatedModules: true,
        strict: true,
        moduleResolution: "node",
        esModuleInterop: true,
        noEmit: true,
      },
      include: ["../src/**/*"],
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "monorepo-custom-config";
    `,
  });
  await build(tmpPath);
  expect(await getFiles(path.join(tmpPath, "packages/pkg-a/dist")))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const thing = "monorepo-custom-config";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGtnLWEuY2pzLmQudHMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuL2RlY2xhcmF0aW9ucy9zcmMvaW5kZXguZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.cjs.dev.js, pkg-a.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const thing = "monorepo-custom-config";

    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./pkg-a.cjs.prod.js");
    } else {
      module.exports = require("./pkg-a.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ pkg-a.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = "monorepo-custom-config";

    export { thing };

  `);
});

test("should fail to build a monorepo package with relative folder and invalid typescript configuration inclusions rules", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-root",
      private: true,
      workspaces: ["packages/*"],
      devDependencies: {
        typescript: "^3.8.3",
      },
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      preconstruct: {
        tsconfig: "./folder/tsconfig.json",
      },
    }),
    "packages/pkg-a/folder/tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "commonjs",
        jsx: "react",
        declaration: true,
        isolatedModules: true,
        strict: true,
        moduleResolution: "node",
        esModuleInterop: true,
        noEmit: true,
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "monorepo-custom-config";
    `,
  });
  await assert.rejects(build(tmpPath));
});

test("should fail to build with invalid custom tsconfig filename in monorepo package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-root",
      private: true,
      workspaces: ["packages/*"],
      devDependencies: {
        typescript: "^3.8.3",
      },
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      preconstruct: {
        tsconfig: "tsconfig.invalid.json",
      },
    }),
    "packages/pkg-a/tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "esnext",
        module: "esnext",
        jsx: "react",
        isolatedModules: true,
        strict: true,
        moduleResolution: "node",
        esModuleInterop: true,
        noEmit: true,
      },
    }),
    "packages/pkg-a/tsconfig.build.json": JSON.stringify({
      compilerOptions: {
        module: "commonjs",
        moduleResolution: "node",
        jsx: "react",
        declaration: true,
        isolatedModules: true,
        strict: true,
        esModuleInterop: true,
        noEmit: true,
      },
    }),
    "packages/pkg-a/src/index.ts": ts`
      export const thing = "custom-invalid-config";
    `,
  });
  await expect(build(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: 🎁 pkg-a the custom TypeScript config file tsconfig.invalid.json does not exist.]`
  );
});
