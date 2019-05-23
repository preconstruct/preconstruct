// @flow
import build from "../";
import fixturez from "fixturez";
import { FatalError } from "../../errors";
import {
  snapshotDistFiles,
  snapshotDirectory,
  install
} from "../../../test-utils";
import { confirms } from "../../messages";

const f = fixturez(__dirname);

jest.mock("../../prompt");

jest.setTimeout(30000);

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
  await snapshotDirectory(tmpPath, { files: "all" });
});

test("browser no module", async () => {
  let tmpPath = f.copy("browser-no-module");

  confirms.addBrowserField.mockReturnValue(Promise.resolve(true));

  await build(tmpPath);
  expect(confirms.addBrowserField).toBeCalledTimes(1);
  await snapshotDirectory(tmpPath, { files: "all" });
});

test("typescript", async () => {
  let tmpPath = f.copy("typescript");

  await install(tmpPath);
  await build(tmpPath);

  await snapshotDirectory(tmpPath, { files: "all" });
});

test("package resolvable but not in deps", async () => {
  let tmpPath = f.copy("package-resolvable-but-not-in-deps");
  await install(tmpPath);
  try {
    await build(tmpPath);
  } catch (err) {
    expect(err).toBeInstanceOf(FatalError);
    expect(err.message).toMatchInlineSnapshot(
      `"\\"react\\" is imported by \\"src/index.js\\" but it is not specified in dependencies or peerDependencies"`
    );
    return;
  }
  expect(true).toBe(false);
});

test("entrypoint outside package directory", async () => {
  let tmpPath = f.copy("entrypoint-outside-pkg-dir");
  await install(tmpPath);
  try {
    await build(tmpPath);
  } catch (err) {
    expect(err).toBeInstanceOf(FatalError);
    expect(err.message).toMatchInlineSnapshot(
      `"entrypoint source files must be inside their respective package directory but this entrypoint has specified its source file as ../some-file"`
    );
    return;
  }
  expect(true).toBe(false);
});

test("module imported outside package directory", async () => {
  let tmpPath = f.copy("imports-outside-pkg-dir");
  await install(tmpPath);
  try {
    await build(tmpPath);
  } catch (err) {
    expect(err).toBeInstanceOf(FatalError);
    expect(err.message).toMatchInlineSnapshot(
      `"all relative imports in a package should only import modules inside of their package directory but \\"src/index.js\\" is importing \\"../../some-file\\""`
    );
    return;
  }
  expect(true).toBe(false);
});
