import path from "path";
import build from "..";
import {
  snapshotDirectory,
  testdir,
  ts,
  repoNodeModules,
} from "../../../test-utils";

jest.setTimeout(6000000);

jest.mock("../../prompt");

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
    `[Error: 🎁 pkg-a the custom TypeScript config file tsconfig.invalid.json does not exist.]`
  );
});
