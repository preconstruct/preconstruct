// @flow
import build from "../";
import fixturez from "fixturez";
import { snapshotDirectory } from "../../../test-utils";
import { confirms } from "../../messages";

const f = fixturez(__dirname);

jest.mock("../../prompt");

test("two-entrypoints-one-with-typeof-browser-one-without", async () => {
  let tmpPath = f.copy("two-entrypoints-one-with-typeof-window-one-without");

  confirms.addBrowserField.mockReturnValue(Promise.resolve(true));

  await build(tmpPath);

  expect(confirms.addBrowserField).toBeCalledTimes(1);

  await snapshotDirectory(tmpPath, "all");
});
