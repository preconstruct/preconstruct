// @flow
import build from "../";
import fixturez from "fixturez";
import path from "path";
import * as fs from "fs-extra";
import { initBasic } from "../../../test-utils";
import { confirms } from "../../messages";
import { FatalError } from "../../errors";

const f = fixturez(__dirname);

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
