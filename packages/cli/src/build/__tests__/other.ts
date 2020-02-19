import build from "../";
import fixturez from "fixturez";
import { snapshotDirectory, install } from "../../../test-utils";
import { doPromptInput } from "../../prompt";

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
    expect(err.message).toMatchInlineSnapshot(
      `"🎁  package-resolvable-but-not-in-deps \\"react\\" is imported by \\"src/index.js\\" but the package is not specified in dependencies or peerDependencies"`
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
    expect(err.message).toMatchInlineSnapshot(
      `"🎁  @imports-outside-pkg-dir/pkg-a all relative imports in a package should only import modules inside of their package directory but \\"src/index.js\\" is importing \\"../../some-file\\""`
    );
    return;
  }
  expect(true).toBe(false);
});

test("using external @babel/runtime helpers", async () => {
  let tmpPath = f.copy("external-babel-runtime");

  await install(tmpPath);
  await build(tmpPath);

  await snapshotDirectory(tmpPath, { files: "all" });
});

test("should lazily get globals", async () => {
  let tmpPath = f.copy("umd-unused-peer-dep");

  (doPromptInput as jest.MockedFunction<
    typeof doPromptInput
  >).mockImplementation((question, { name }, thing) => {
    console.log("called");
    throw new Error(
      `this should never be called: ${JSON.stringify({
        question,
        name,
        thing
      })}`
    );
  });

  await build(tmpPath);

  await snapshotDirectory(tmpPath);
});

test("batches build errors", async () => {
  let tmpPath = f.copy("lots-of-errors");
  let error;
  try {
    await build(tmpPath);
    throw new Error("should never happen");
  } catch (err) {
    error = err;
  }
  expect(error).toMatchInlineSnapshot(`
    [Error: 🎁  @errors/package-one "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁  @errors/package-one "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁  @errors/package-two "something-2" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies
    🎁  @errors/package-two "something" is imported by "src/index.js" but the package is not specified in dependencies or peerDependencies]
  `);
});

test("builds package using eval", async () => {
  let tmpPath = f.copy("eval");

  await build(tmpPath);

  await snapshotDirectory(tmpPath, { files: "all" });
});
