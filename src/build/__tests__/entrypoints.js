// @flow
import build from "../";
import fixturez from "fixturez";
import { initBasic, snapshotDistFiles } from "../../../test-utils";

jest.mock("../../prompt");

const f = fixturez(__dirname);

test("non default src", async () => {
  let tmpPath = f.copy("non-default-src");
  await initBasic(tmpPath);
  await build(tmpPath);
  await snapshotDistFiles(tmpPath);
});
