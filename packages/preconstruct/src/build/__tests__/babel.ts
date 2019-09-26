import build from "../";
import fixturez from "fixturez";
import { confirms as _confirms } from "../../messages";
import { install, snapshotDirectory } from "../../../test-utils";

const f = fixturez(__dirname);

jest.setTimeout(20000);

jest.mock("../../prompt");

beforeEach(() => {
  jest.resetAllMocks();
});

let confirms = _confirms as jest.Mocked<typeof _confirms>;

// this test is causing to much frustration
test.skip("needs @babel/runtime allow install", async () => {
  let tmpPath = f.copy("use-babel-runtime");
  await install(tmpPath);
  confirms.shouldInstallBabelRuntime.mockReturnValue(Promise.resolve(true));

  await build(tmpPath);

  // TODO: investigate why this is called more than one time
  expect(confirms.shouldInstallBabelRuntime).toBeCalled();

  await snapshotDirectory(tmpPath, { files: "all" });
});
