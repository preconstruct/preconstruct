import path from "path";
import build from "..";
import {
  snapshotDirectory,
  testdirWithLegacyPreconstructDefaults as testdir,
  ts,
  repoNodeModules,
} from "../../../test-utils";

vi.setConfig({ testTimeout: 6000000 });

vi.mock("../../prompt");

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
  await snapshotDirectory(path.join(tmpPath, "dist"), { files: "all" });
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
    `
    [Error: 🎁 typescript-invalid-custom-config Error: Build failed with 1 error:
    🎁 typescript-invalid-custom-config
    🎁 typescript-invalid-custom-config [plugin typescript-declarations]
    🎁 typescript-invalid-custom-config Error: the custom TypeScript config file tsconfig.invalid.json does not exist.
    🎁 typescript-invalid-custom-config     at retrieveConfigFilenameOrThrow (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:136:13)
    🎁 typescript-invalid-custom-config     at getProgram (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:164:24)
    🎁 typescript-invalid-custom-config     at PluginContextImpl.generateBundle (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/index.ts:57:42)
    🎁 typescript-invalid-custom-config     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1707:18)
    🎁 typescript-invalid-custom-config     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:18)
    🎁 typescript-invalid-custom-config     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
    🎁 typescript-invalid-custom-config     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
    🎁 typescript-invalid-custom-config     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
    🎁 typescript-invalid-custom-config     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
    🎁 typescript-invalid-custom-config     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
    🎁 typescript-invalid-custom-config     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
    🎁 typescript-invalid-custom-config     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
    🎁 typescript-invalid-custom-config     at Module.build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
    🎁 typescript-invalid-custom-config     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/tsconfig.ts:108:3
    🎁 typescript-invalid-custom-config     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
    🎁 typescript-invalid-custom-config   errors: [Getter/Setter]
    🎁 typescript-invalid-custom-config }]
  `
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
  await snapshotDirectory(path.join(tmpPath, "packages/pkg-a/dist"), {
    files: "all",
  });
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
  await snapshotDirectory(path.join(tmpPath, "packages/pkg-a/dist"), {
    files: "all",
  });
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
  await expect(build(tmpPath)).rejects.toThrowError();
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
    `
    [Error: 🎁 pkg-a Error: Build failed with 1 error:
    🎁 pkg-a
    🎁 pkg-a [plugin typescript-declarations]
    🎁 pkg-a Error: the custom TypeScript config file tsconfig.invalid.json does not exist.
    🎁 pkg-a     at retrieveConfigFilenameOrThrow (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:136:13)
    🎁 pkg-a     at getProgram (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/common.ts:164:24)
    🎁 pkg-a     at PluginContextImpl.generateBundle (/Users/emma/projects/preconstruct/packages/cli/src/rollup-plugins/typescript-declarations/index.ts:57:42)
    🎁 pkg-a     at plugin (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1707:18)
    🎁 pkg-a     at plugin.<computed> (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/bindingify-input-options-XPJLJOD0.mjs:1959:18)
    🎁 pkg-a     at aggregateBindingErrorsIntoJsError (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:48:18)
    🎁 pkg-a     at unwrapBindingResult (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/error-BHRSI0R7.mjs:18:128)
    🎁 pkg-a     at RolldownBuild.#build (file:///Users/emma/projects/preconstruct/node_modules/rolldown/dist/shared/rolldown-build-CtPvmZgJ.mjs:3276:34)
    🎁 pkg-a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:73:29
    🎁 pkg-a     at buildPackage (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:63:17)
    🎁 pkg-a     at retryableBuild (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:102:5)
    🎁 pkg-a     at /Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:140:11
    🎁 pkg-a     at Module.build (/Users/emma/projects/preconstruct/packages/cli/src/build/index.ts:137:5)
    🎁 pkg-a     at /Users/emma/projects/preconstruct/packages/cli/src/build/__tests__/tsconfig.ts:339:3
    🎁 pkg-a     at file:///Users/emma/projects/preconstruct/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:20 {
    🎁 pkg-a   errors: [Getter/Setter]
    🎁 pkg-a }]
  `
  );
});
