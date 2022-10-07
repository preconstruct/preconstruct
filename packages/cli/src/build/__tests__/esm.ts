import build from "../";
import { testdir, js, getFiles } from "../../../test-utils";

jest.setTimeout(10000);

jest.mock("../../prompt");

afterEach(() => {
  jest.resetAllMocks();
});

describe("esm", () => {
  it("basic", async () => {
    let dir = await testdir({
      "package.json": JSON.stringify({
        name: "basic",
        type: "module",
        main: "dist/basic.esm.js",
        preconstruct: {
          entrypoints: ["index.js"],
        },
      }),
      "src/index.js": js`
                        export let sum = (a, b) => a + b;
                      `,
    });

    await build(dir);

    expect(await getFiles(dir, ["**/dist/**"])).toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/basic.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      let sum = (a, b) => a + b;

      export { sum };

    `);
  });

  test("multiple entrypoints", async () => {
    let dir = await testdir({
      "package.json": JSON.stringify({
        name: "multiple-entrypoints",
        type: "module",
        main: "dist/multiple-entrypoints.esm.js",
        preconstruct: {
          entrypoints: ["index.js", "multiply.js"],
        },
      }),
      "multiply/package.json": JSON.stringify({
        main: "dist/multiple-entrypoints-multiply.esm.js",
      }),
      "src/index.js": js`
                        export let sum = (a, b) => a + b;
                      `,
      "src/multiply.js": js`
                           export let multiply = (a, b) => a * b;
                         `,
    });

    await build(dir);

    expect(await getFiles(dir, ["**/dist/**"])).toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/multiple-entrypoints.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      let sum = (a, b) => a + b;

      export { sum };

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ multiply/dist/multiple-entrypoints-multiply.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      let multiply = (a, b) => a * b;

      export { multiply };

    `);
  });

  test("with browser", async () => {
    let dir = await testdir({
      "package.json": JSON.stringify({
        name: "browser",
        type: "module",
        main: "dist/browser.esm.js",
        browser: {
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
    expect(await getFiles(dir, ["**/dist/**"])).toMatchInlineSnapshot(`
      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
      let thing = "wow";

      {
        thing = "something";
      }

      {
        thing += "other";
      }

      var thing$1 = thing;

      export default thing$1;

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
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
});
