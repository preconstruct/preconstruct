import path from "path";
import fixturez from "fixturez";
import build from "../";
import {
  snapshotDirectory,
  testdir,
  repoNodeModules,
  initBasic,
  install,
  snapshotDistFiles,
} from "../../../test-utils";

jest.setTimeout(6000000);

jest.mock("../../prompt");

const f = fixturez(__dirname);

let unsafeRequire = require;
test("monorepo", async () => {
  let tmpPath = f.copy("monorepo");
  await initBasic(tmpPath);
  await install(tmpPath);
  await build(tmpPath);
  let counter = 1;
  for (let pkg of ["package-one", "package-two"]) {
    let pkgPath = path.join(tmpPath, "packages", pkg);
    await snapshotDistFiles(pkgPath);

    expect(unsafeRequire(pkgPath).default).toBe(counter++);
  }
});

test("monorepo with local .babelrc", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-babelrc",
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    "packages/pkg/package.json": JSON.stringify({
      name: "monorepo-babelrc-pkg",
      main: "dist/monorepo-babelrc-pkg.cjs.js",
      module: "dist/monorepo-babelrc-pkg.esm.js",
    }),
    "packages/pkg/src/index.js": "export default () => <div>hello</div>",
    "packages/pkg/.babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-react")],
    }),
    "packages/pkg/node_modules": {
      kind: "symlink",
      path: repoNodeModules,
    },
  });

  await build(tmpPath);

  await snapshotDirectory(path.join(tmpPath, "dist"), { files: "all" });
});

test("monorepo with two packages and one .babelrc", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-babelrc",
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    "packages/pkg/package.json": JSON.stringify({
      name: "monorepo-babelrc-pkg",
      main: "dist/monorepo-babelrc-pkg.cjs.js",
      module: "dist/monorepo-babelrc-pkg.esm.js",
    }),
    "packages/pkg/src/index.js": "export default () => <div>hello</div>",
    "packages/pkg/.babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-react")],
    }),
    "packages/pkg/node_modules": {
      kind: "symlink",
      path: repoNodeModules,
    },
    "packages/pkg2/package.json": JSON.stringify({
      name: "monorepo-babelrc-pkg2",
      main: "dist/monorepo-babelrc-pkg2.cjs.js",
      module: "dist/monorepo-babelrc-pkg2.esm.js",
      dependencies: {
        "monorepo-babelrc-pkg": "*",
      },
    }),
    "packages/pkg2/src/index.js": `
      import Component from "monorepo-babelrc-pkg";

      export default Component;
    `,
  });

  await build(tmpPath);

  await snapshotDirectory(path.join(tmpPath, "dist"), { files: "all" });
});

test("monorepo with missing .babelrc", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-babelrc",
      preconstruct: {
        packages: ["packages/*"],
      },
    }),
    "packages/pkg/package.json": JSON.stringify({
      name: "monorepo-babelrc-pkg",
      main: "dist/monorepo-babelrc-pkg.cjs.js",
      module: "dist/monorepo-babelrc-pkg.esm.js",
    }),
    "packages/pkg/src/index.js": "export default () => <div>hello</div>",
    "packages/pkg/.babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-react")],
    }),
    "packages/pkg/node_modules": {
      kind: "symlink",
      path: repoNodeModules,
    },
    "packages/pkg2/package.json": JSON.stringify({
      name: "monorepo-babelrc-pkg2",
      main: "dist/monorepo-babelrc-pkg2.cjs.js",
      module: "dist/monorepo-babelrc-pkg2.esm.js",
      dependencies: {
        "monorepo-babelrc-pkg": "*",
      },
    }),
    "packages/pkg2/src/index.js": `
      export default () => <div>hello</div>;
    `,
  });

  await expect(build(tmpPath)).rejects.toThrow();
});
