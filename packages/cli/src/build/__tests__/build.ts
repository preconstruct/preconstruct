import build from "../";
import fixturez from "fixturez";
import path from "path";
import {
  initBasic,
  getPkg,
  snapshotDistFiles,
  install,
} from "../../../test-utils";
import { doPromptInput as _doPromptInput } from "../../prompt";
import { confirms as _confirms } from "../../messages";

const f = fixturez(__dirname);

jest.mock("../../prompt");

let doPromptInput = _doPromptInput as jest.MockedFunction<
  typeof _doPromptInput
>;

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

test("no module", async () => {
  let tmpPath = f.copy("no-module");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);

  expect(unsafeRequire(tmpPath).default).toBe(
    "this does not have a module build"
  );
});

test("clears dist folder", async () => {
  let tmpPath = f.copy("already-has-things-in-dist");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("flow", async () => {
  let tmpPath = f.copy("flow");

  await install(tmpPath);

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("flow", async () => {
  let tmpPath = f.copy("flow-export-default");

  await install(tmpPath);

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("prod checks", async () => {
  let tmpPath = f.copy("prod-checks");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

// TODO: make it faster so this isn't required
jest.setTimeout(20000);

test("umd with dep on other module", async () => {
  let tmpPath = f.copy("umd-with-dep");

  await install(tmpPath);

  doPromptInput.mockImplementation(async (question) => {
    if (question === `What should the umdName of react be?`) {
      return "React";
    }
    throw new Error("unexpected question: " + question);
  });

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
Object {
  "devDependencies": Object {
    "react": "^16.6.3",
  },
  "license": "MIT",
  "main": "dist/umd-with-dep.cjs.js",
  "name": "umd-with-dep",
  "peerDependencies": Object {
    "react": "^16.6.3",
  },
  "preconstruct": Object {
    "globals": Object {
      "react": "React",
    },
    "umdName": "umdWithDep",
  },
  "private": true,
  "umd:main": "dist/umd-with-dep.umd.min.js",
  "version": "1.0.0",
}
`);
});

test("monorepo umd with dep on other module", async () => {
  let tmpPath = f.copy("monorepo-umd-with-dep");
  let asked = false;
  doPromptInput.mockImplementation(async (question) => {
    if (asked) {
      throw new Error("only one prompt should happen: " + question);
    }
    if (question === `What should the umdName of react be?`) {
      asked = true;
      return "React";
    }
    throw new Error("unexpected question: " + question);
  });
  await install(tmpPath);
  await build(tmpPath);

  await snapshotDistFiles(path.join(tmpPath, "packages", "package-one"));
  await snapshotDistFiles(path.join(tmpPath, "packages", "package-two"));
  await snapshotDistFiles(path.join(tmpPath, "packages", "package-three"));
  await snapshotDistFiles(path.join(tmpPath, "packages", "package-four"));

  expect(await getPkg(path.join(tmpPath, "packages", "package-one")))
    .toMatchInlineSnapshot(`
Object {
  "devDependencies": Object {
    "react": "^16.6.3",
  },
  "license": "MIT",
  "main": "dist/package-one-umd-with-dep.cjs.js",
  "name": "@some-scope/package-one-umd-with-dep",
  "peerDependencies": Object {
    "react": "^16.6.3",
  },
  "preconstruct": Object {
    "umdName": "packageOne",
  },
  "private": true,
  "umd:main": "dist/package-one-umd-with-dep.umd.min.js",
  "version": "1.0.0",
}
`);

  expect(await getPkg(path.join(tmpPath, "packages", "package-two")))
    .toMatchInlineSnapshot(`
Object {
  "devDependencies": Object {
    "react": "^16.6.3",
  },
  "license": "MIT",
  "main": "dist/package-two-umd-with-dep.cjs.js",
  "name": "@some-scope/package-two-umd-with-dep",
  "peerDependencies": Object {
    "react": "^16.6.3",
  },
  "preconstruct": Object {
    "umdName": "packageTwo",
  },
  "private": true,
  "umd:main": "dist/package-two-umd-with-dep.umd.min.js",
  "version": "1.0.0",
}
`);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
Object {
  "license": "MIT",
  "main": "index.js",
  "name": "monorepo-umd-with-dep",
  "preconstruct": Object {
    "globals": Object {
      "react": "React",
    },
    "packages": Array [
      "packages/*",
    ],
  },
  "private": true,
  "version": "1.0.0",
  "workspaces": Array [
    "packages/*",
  ],
}
`);
});

test("monorepo single package", async () => {
  let tmpPath = f.copy("monorepo-single-package");
  await initBasic(tmpPath);
  await install(tmpPath);

  await build(tmpPath);
  let pkgPath = path.join(tmpPath, "packages", "package-two");
  await snapshotDistFiles(pkgPath);

  expect(unsafeRequire(pkgPath).default).toBe(2);
});

test("json", async () => {
  let tmpPath = f.copy("json");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});
