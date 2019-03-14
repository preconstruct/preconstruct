// @flow
import build from "../";
import fixturez from "fixturez";
import { snapshotDistFiles, snapshotDirectory } from "../../../test-utils";

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

  await snapshotDirectory(tmpPath);
});

test("two entrypoints, one module, one not", async () => {
  let tmpPath = f.copy("two-entrypoints-one-module-one-not");

  await build(tmpPath);

  await snapshotDirectory(tmpPath);
});

test("two entrypoints with a common dependency", async () => {
  let tmpPath = f.copy("common-dependency-two-entrypoints");

  await build(tmpPath);

  await snapshotDirectory(tmpPath);
});
