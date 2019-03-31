// @flow
import build from "../";
import fixturez from "fixturez";
import { snapshotDirectory, install } from "../../../test-utils";

const f = fixturez(__dirname);

jest.mock("../../prompt");

test("field types", async () => {
  let tmpPath = f.copy("field-types");
  await install(tmpPath);
  await build(tmpPath);

  await snapshotDirectory(tmpPath);
});
