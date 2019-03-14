// @flow
import build from "../";
import path from "path";
import fixturez from "fixturez";
import { snapshotDistFiles } from "../../../test-utils";

const f = fixturez(__dirname);

jest.mock("../../prompt");

test("source entrypoint option", async () => {
  let tmpPath = f.copy("source-entrypoint-option");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("source entrypoint option flow", async () => {
  let tmpPath = f.copy("source-entrypoint-option-flow");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("multiple entrypoints", async () => {
  let tmpPath = f.copy("multiple-entrypoints");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
  await snapshotDistFiles(path.join(tmpPath, "multiply"));
});
