// @flow
import build from "../";
import fixturez from "fixturez";
import { snapshotDirectory } from "../../../test-utils";

const f = fixturez(__dirname);

jest.mock("../../prompt");

test("field types", async () => {
  let tmpPath = f.copy("field-types");

  await build(tmpPath);

  await snapshotDirectory(tmpPath);
});
