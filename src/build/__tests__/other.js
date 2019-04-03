// @flow
import build from "../";
import fixturez from "fixturez";
import {
  snapshotDistFiles,
  snapshotDirectory,
  install
} from "../../../test-utils";
import { confirms } from "../../messages";

const f = fixturez(__dirname);

jest.mock("../../prompt");

afterEach(() => {
  jest.resetAllMocks();
});

test("react native", async () => {
  let tmpPath = f.copy("with-react-native-field");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});

test("browser", async () => {
  let tmpPath = f.copy("browser");

  confirms.addBrowserField.mockReturnValue(Promise.resolve(true));

  await build(tmpPath);
  expect(confirms.addBrowserField).toBeCalledTimes(1);
  await snapshotDirectory(tmpPath, "all");
});

test("browser no module", async () => {
  let tmpPath = f.copy("browser-no-module");

  confirms.addBrowserField.mockReturnValue(Promise.resolve(true));

  await build(tmpPath);
  expect(confirms.addBrowserField).toBeCalledTimes(1);
  await snapshotDirectory(tmpPath, "all");
});

test("typescript", async () => {
  let tmpPath = f.copy("typescript");

  await install(tmpPath);
  await build(tmpPath);

  await snapshotDirectory(tmpPath, "all");
});
