// @flow
import build from "../";
import fixturez from "fixturez";
import path from "path";
import * as fs from "fs-extra";
import { initBasic, getPkg } from "../../../test-utils";
import { confirms } from "../../messages";
import { FatalError } from "../../errors";
import { promptInput } from "../../prompt";

const f = fixturez(__dirname);

let unsafePromptInput: any = promptInput;

async function snapshotDistFiles(tmpPath: string) {
  let distPath = path.join(tmpPath, "dist");
  let distFiles;
  try {
    distFiles = await fs.readdir(distPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error("no dist directory exists");
    }
    throw err;
  }

  await Promise.all(
    distFiles.map(async x => {
      expect(
        await fs.readFile(path.join(distPath, x), "utf-8")
      ).toMatchSnapshot(x);
    })
  );
}

jest.mock("install-packages");

let unsafeRequire = require;

test("basic", async () => {
  let tmpPath = f.copy("valid-package");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);

  expect(unsafeRequire(tmpPath).default).toBe("something");
});

test("monorepo", async () => {
  let tmpPath = f.copy("monorepo");
  await initBasic(tmpPath);
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

test.skip("uses obj spread", async () => {
  let tmpPath = f.copy("use-obj-spread");
  confirms.shouldInstallObjectAssign.mockReturnValue(Promise.resolve(false));

  try {
    await build(tmpPath);
  } catch (err) {
    expect(err).toBeInstanceOf(FatalError);
    expect(err.message).toBe(
      "object-assign should be in dependencies of use-object-spread"
    );
  }
});

test("object-assign installed", async () => {
  let tmpPath = f.copy("object-assign-installed");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("clears dist folder", async () => {
  let tmpPath = f.copy("already-has-things-in-dist");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("flow", async () => {
  let tmpPath = f.copy("flow");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("flow", async () => {
  let tmpPath = f.copy("flow-export-default");

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

test("browser", async () => {
  let tmpPath = f.copy("browser");

  confirms.addBrowserField.mockReturnValue(Promise.resolve(true));

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("umd with dep on other module", async () => {
  let tmpPath = f.copy("umd-with-dep");

  unsafePromptInput.mockImplementation(async question => {
    if (question === `What should the umdName of react be?`) {
      return "React";
    }
    throw new Error("unexpected question: " + question);
  });

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
Object {
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
  unsafePromptInput.mockImplementation(async question => {
    if (asked) {
      throw new Error("only one prompt should happen: " + question);
    }
    if (question === `What should the umdName of react be?`) {
      asked = true;
      return "React";
    }
    throw new Error("unexpected question: " + question);
  });

  await build(tmpPath);

  await snapshotDistFiles(path.join(tmpPath, "packages", "package-one"));
  await snapshotDistFiles(path.join(tmpPath, "packages", "package-two"));

  expect(await getPkg(path.join(tmpPath, "packages", "package-one")))
    .toMatchInlineSnapshot(`
Object {
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
}
`);
});
