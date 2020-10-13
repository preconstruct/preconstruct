import build from "../";
import fixturez from "fixturez";
import {
  snapshotDirectory,
  install,
  testdir,
  js,
  getDist,
} from "../../../test-utils";
import { doPromptInput } from "../../prompt";

const f = fixturez(__dirname);

jest.mock("../../prompt");

jest.setTimeout(30000);

afterEach(() => {
  jest.resetAllMocks();
});

test("browser", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "browser",
      main: "dist/browser.cjs.js",
      module: "dist/browser.esm.js",
      browser: {
        "./dist/browser.cjs.js": "./dist/browser.browser.cjs.js",
        "./dist/browser.esm.js": "./dist/browser.browser.esm.js",
      },
    }),
    "src/index.js": js`
                      let thing = "wow";
                      
                      if (typeof window !== "undefined") {
                        thing = "something";
                      }
                      
                      if (typeof document !== undefined) {
                        thing += "other";
                      }
                      
                      export default thing;
                    `,
  });

  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    dist/browser.browser.cjs.js -------------
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let thing = "wow";

    {
      thing = "something";
    }

    {
      thing += "other";
    }

    var thing$1 = thing;

    exports.default = thing$1;

    dist/browser.browser.esm.js -------------
    let thing = "wow";

    {
      thing = "something";
    }

    {
      thing += "other";
    }

    var thing$1 = thing;

    export default thing$1;

    dist/browser.cjs.dev.js -------------
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    let thing = "wow";

    if (typeof window !== "undefined") {
      thing = "something";
    }

    if (typeof document !== undefined) {
      thing += "other";
    }

    var thing$1 = thing;

    exports.default = thing$1;

    dist/browser.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./browser.cjs.prod.js");
    } else {
      module.exports = require("./browser.cjs.dev.js");
    }

    dist/browser.cjs.prod.js -------------
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: !0
    });

    let thing = "wow";

    "undefined" != typeof window && (thing = "something"), void 0 !== typeof document && (thing += "other");

    var thing$1 = thing;

    exports.default = thing$1;

    dist/browser.esm.js -------------
    let thing = "wow";

    if (typeof window !== "undefined") {
      thing = "something";
    }

    if (typeof document !== undefined) {
      thing += "other";
    }

    var thing$1 = thing;

    export default thing$1;

  `);
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

test("typescript with forced dts emit", async () => {
  let tmpPath = f.copy("typescript-force-dts-emit");

  await install(tmpPath);
  await build(tmpPath);

  await snapshotDirectory(tmpPath, {
    files: "all",
    filterPath: (fp) => fp.startsWith("dist/"),
  });
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
        thing,
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
