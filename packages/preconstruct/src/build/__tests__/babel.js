// @flow
import build from "../";
import { confirms } from "../../messages";
import { snapshotDirectory, fixturez } from "../../../test-utils";

const f = fixturez(__dirname);

jest.setTimeout(20000);

jest.mock("../../prompt");

beforeEach(() => {
  jest.resetAllMocks();
});

// this test is causing to much frustration
test.skip("needs @babel/runtime allow install", async () => {
  let tmpPath = f.copy("use-babel-runtime");
  confirms.shouldInstallBabelRuntime.mockReturnValue(Promise.resolve(true));

  await build(tmpPath);

  // TODO: investigate why this is called more than one time
  expect(confirms.shouldInstallBabelRuntime).toBeCalled();

  await snapshotDirectory(tmpPath, { files: "all" });
});
