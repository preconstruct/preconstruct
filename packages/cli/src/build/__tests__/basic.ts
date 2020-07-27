import path from "path";
import build from "../";
import fixturez from "fixturez";
import {
  snapshotDistFiles,
  install,
  snapshotDirectory
} from "../../../test-utils";
import spawn from "spawndamnit";

const f = fixturez(__dirname);

jest.setTimeout(6000000);

jest.mock("../../prompt");

let unsafeRequire = require;

test("basic", async () => {
  let tmpPath = f.copy("valid-package");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);

  expect(unsafeRequire(tmpPath).default).toBe("something");
});

test("typescript thing", async () => {
  let tmpPath = f.find("weird-typescript-thing");
  await build(tmpPath);

  await snapshotDirectory(path.join(tmpPath, "dist"), { files: "all" });
});
