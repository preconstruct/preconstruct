// @flow
import build from "../";
import fixturez from "fixturez";
import { confirms } from "../../messages";
import { FatalError } from "../../errors";
import { install } from "../../../test-utils";

const f = fixturez(__dirname);

jest.setTimeout(20000);

jest.mock("../../prompt");

test("needs @babel/runtime disallow install", async () => {
  let tmpPath = f.copy("use-babel-runtime");
  await install(tmpPath);
  confirms.shouldInstallBabelRuntime.mockReturnValue(Promise.resolve(false));

  try {
    await build(tmpPath);
  } catch (err) {
    expect(err).toBeInstanceOf(FatalError);
    expect(err.message).toMatchInlineSnapshot(
      `"@babel/runtime should be in dependencies of use-babel-runtime"`
    );
    return;
  }
  expect(true).toBe(false);
});
