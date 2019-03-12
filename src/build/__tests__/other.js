// @flow
import build from "../";
import fixturez from "fixturez";
import { snapshotDistFiles } from "../../../test-utils";

const f = fixturez(__dirname);

jest.mock("../../prompt");

test("react native", async () => {
  let tmpPath = f.copy("with-react-native-field");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);
});
