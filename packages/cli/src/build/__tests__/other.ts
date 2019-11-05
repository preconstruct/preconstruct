import build from "../";
import fixturez from "fixturez";
import { FatalError } from "../../errors";
import { snapshotDirectory, install } from "../../../test-utils";

const f = fixturez(__dirname);

jest.mock("../../prompt");

jest.setTimeout(30000);

afterEach(() => {
  jest.resetAllMocks();
});

test("browser", async () => {
  let tmpPath = f.copy("browser");

  await build(tmpPath);
  await snapshotDirectory(tmpPath, { files: "all" });
});

test("browser no module", async () => {
  let tmpPath = f.copy("browser-no-module");

  await build(tmpPath);
  await snapshotDirectory(tmpPath, { files: "all" });
});

test("typescript", async () => {
  let tmpPath = f.copy("typescript-monorepo");

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
      `"\\"react\\" is imported by \\"src/index.js\\" but the package is not specified in dependencies or peerDependencies"`
    );
    return;
  }
  expect(true).toBe(false);
});

test("entrypoint outside package directory", async () => {
  let tmpPath = f.copy("entrypoint-outside-pkg-dir");
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
