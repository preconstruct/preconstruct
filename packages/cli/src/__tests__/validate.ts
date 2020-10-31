import fixturez from "fixturez";
import path from "path";
import validate from "../validate";
import {
  logMock,
  modifyPkg,
  getPkg,
  testdir,
  js,
  repoNodeModules,
} from "../../test-utils";
import { confirms as _confirms } from "../messages";

const f = fixturez(__dirname);

jest.mock("../prompt");

afterEach(() => {
  jest.resetAllMocks();
});

let confirms = _confirms as jest.Mocked<typeof _confirms>;

test("reports correct result on valid package", async () => {
  let tmpPath = f.find("valid-package");

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "🎁 info valid-package a valid entry point exists.",
      ],
      Array [
        "🎁 info valid-package main field is valid",
      ],
      Array [
        "🎁 info valid-package module field is valid",
      ],
      Array [
        "🎁 info valid-package umd:main field is valid",
      ],
      Array [
        "🎁 success project is valid!",
      ],
    ]
  `);
});

test("no main field", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "no-main-field",
      license: "MIT",
      private: true,
    }),

    "src/index.js": js`
                      // @flow
                      
                      export default "something";
                    `,
  });

  try {
    await validate(tmpPath);
  } catch (e) {
    expect(e).toMatchInlineSnapshot(
      `[Error: main field was not found, expected \`"dist/no-main-field.cjs.js"\`]`
    );
    return;
  }

  expect(true).toBe(false);
});

test("no module", async () => {
  let tmpPath = f.find("no-module");

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "🎁 info no-module a valid entry point exists.",
      ],
      Array [
        "🎁 info no-module main field is valid",
      ],
      Array [
        "🎁 success project is valid!",
      ],
    ]
  `);
});

test("invalid browser", async () => {
  let tmpPath = f.copy("no-module");

  await modifyPkg(tmpPath, (pkg) => {
    pkg.browser = "invalid.js";
  });
  await expect(validate(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: browser field is invalid, found \`"invalid.js"\`, expected \`{"./dist/no-module.cjs.js":"./dist/no-module.browser.cjs.js"}\`]`
  );
});

test("valid browser", async () => {
  let tmpPath = f.copy("valid-package");

  await modifyPkg(tmpPath, (pkg) => {
    pkg.browser = {
      ["./dist/valid-package.cjs.js"]: "./dist/valid-package.browser.cjs.js",
      ["./dist/valid-package.esm.js"]: "./dist/valid-package.browser.esm.js",
    };
  });

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "🎁 info valid-package a valid entry point exists.",
      ],
      Array [
        "🎁 info valid-package main field is valid",
      ],
      Array [
        "🎁 info valid-package module field is valid",
      ],
      Array [
        "🎁 info valid-package umd:main field is valid",
      ],
      Array [
        "🎁 info valid-package browser field is valid",
      ],
      Array [
        "🎁 success project is valid!",
      ],
    ]
  `);
});

test("monorepo single package", async () => {
  let tmpPath = f.copy("monorepo-single-package");

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "🎁 info @some-scope/package-two-single-package a valid entry point exists.",
      ],
      Array [
        "🎁 info @some-scope/package-two-single-package main field is valid",
      ],
      Array [
        "🎁 success project is valid!",
      ],
    ]
  `);
});

test("one-entrypoint-with-browser-field-one-without", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "one-entrypoint-with-browser-field-one-without",
      main: "dist/one-entrypoint-with-browser-field-one-without.cjs.js",
      module: "dist/one-entrypoint-with-browser-field-one-without.esm.js",

      preconstruct: {
        source: "src/sum",
        entrypoints: [".", "multiply"],
      },
    }),

    "multiply/package.json": JSON.stringify({
      main: "dist/one-entrypoint-with-browser-field-one-without.cjs.js",
      module: "dist/one-entrypoint-with-browser-field-one-without.esm.js",

      preconstruct: {
        source: "../src/multiply.js",
      },

      browser: {
        "./dist/one-entrypoint-with-browser-field-one-without.cjs.js":
          "./dist/one-entrypoint-with-browser-field-one-without.browser.cjs.js",
        "./dist/one-entrypoint-with-browser-field-one-without.esm.js":
          "./dist/one-entrypoint-with-browser-field-one-without.browser.esm.js",
      },
    }),

    "src/identity.js": js`
                         export let identity = (x) => x;
                       `,

    "src/multiply.js": js`
                         import { identity } from "./identity";
                         
                         export let multiply = (a, b) => identity(a * b);
                       `,

    "src/sum.js": js`
                    import { identity } from "./identity";
                    
                    export let sum = (a, b) => identity(a + b);
                  `,
  });
  await expect(validate(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: one-entrypoint-with-browser-field-one-without/multiply has a browser build but one-entrypoint-with-browser-field-one-without does not have a browser build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.]`
  );
});

test("create package.json for an entrypoint", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "entrypoint-pkg-json-missing",
      main: "dist/entrypoint-pkg-json-missing.cjs.js",
      module: "dist/entrypoint-pkg-json-missing.esm.js",

      preconstruct: {
        entrypoints: [".", "other"],
      },
    }),

    "src/index.js": js`
                      export default "something";
                    `,

    "other/src/index.js": js`
                            export default "something";
                          `,
  });
  confirms.createEntrypointPkgJson.mockReturnValue(Promise.resolve(true));

  await validate(tmpPath);

  expect(confirms.createEntrypointPkgJson).toBeCalledTimes(1);

  expect(await getPkg(path.join(tmpPath, "other"))).toMatchInlineSnapshot(`
    Object {
      "main": "dist/entrypoint-pkg-json-missing.cjs.js",
      "module": "dist/entrypoint-pkg-json-missing.esm.js",
    }
  `);
});

test("monorepo umd with dep on other module incorrect peerDeps", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "monorepo-umd-with-dep-incorrect-peerdeps",
      main: "index.js",
      workspaces: ["packages/*"],

      preconstruct: {
        packages: ["packages/*"],

        globals: {
          react: "React",
        },
      },
    }),
    "node_modules/@some-scope-incorrect-peerdeps/package-one-umd-with-dep": {
      kind: "symlink",
      path: "packages/package-one",
    },
    "node_modules/react": {
      kind: "symlink",
      path: path.join(repoNodeModules, "react"),
    },
    "packages/package-four/package.json": JSON.stringify({
      name: "@some-scope-incorrect-peerdeps/package-four-umd-with-dep",
      main: "dist/package-four-umd-with-dep.cjs.js",
      "umd:main": "dist/package-four-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageFour",
      },

      dependencies: {
        "@some-scope-incorrect-peerdeps/package-one-umd-with-dep": "1.0.0",
      },
    }),

    "packages/package-one/package.json": JSON.stringify({
      name: "@some-scope-incorrect-peerdeps/package-one-umd-with-dep",
      main: "dist/package-one-umd-with-dep.cjs.js",
      "umd:main": "dist/package-one-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageOne",
      },

      peerDependencies: {
        react: "^16.6.3",
      },

      devDependencies: {
        react: "^16.6.3",
      },
    }),

    "packages/package-three/package.json": JSON.stringify({
      name: "@some-scope-incorrect-peerdeps/package-three-umd-with-dep",
      main: "dist/package-three-umd-with-dep.cjs.js",
      "umd:main": "dist/package-three-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageThree",
      },

      peerDependencies: {
        "@some-scope-incorrect-peerdeps/package-one-umd-with-dep": "1.0.0",
      },

      devDependencies: {
        "@some-scope-incorrect-peerdeps/package-one-umd-with-dep": "1.0.0",
      },
    }),

    "packages/package-two/package.json": JSON.stringify({
      name: "@some-scope-incorrect-peerdeps/package-two-umd-with-dep",
      main: "dist/package-two-umd-with-dep.cjs.js",
      "umd:main": "dist/package-two-umd-with-dep.umd.min.js",

      preconstruct: {
        umdName: "packageTwo",
      },

      peerDependencies: {
        react: "^16.6.3",
      },

      devDependencies: {
        react: "^16.6.3",
      },
    }),

    "packages/package-four/src/index.js": js`
                                            import "@some-scope/package-one-umd-with-dep";
                                          `,

    "packages/package-one/src/index.js": js`
                                           import { createElement } from "react";
                                           
                                           createElement("div", null);
                                         `,

    "packages/package-three/src/index.js": js`
                                             import "@some-scope/package-one-umd-with-dep";
                                           `,

    "packages/package-two/src/index.js": js`
                                           import { createElement } from "react";
                                           
                                           createElement("h1", null);
                                         `,
  });

  try {
    await validate(tmpPath);
  } catch (err) {
    expect(err).toMatchInlineSnapshot(
      `[Error: the package @some-scope-incorrect-peerdeps/package-four-umd-with-dep depends on @some-scope-incorrect-peerdeps/package-one-umd-with-dep which has a peerDependency on react but react is not specified in the dependencies or peerDependencies of @some-scope-incorrect-peerdeps/package-four-umd-with-dep. please add react to the dependencies or peerDependencies of @some-scope-incorrect-peerdeps/package-four-umd-with-dep]`
    );
    return;
  }
  expect(true).toBe(false);
});

test("dist not included in package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "dist-not-included-in-pkg",
      main: "dist/dist-not-included-in-pkg.cjs.js",
      module: "dist/dist-not-included-in-pkg.esm.js",
      files: ["src"],
    }),

    "src/index.js": js`
                      export default "something";
                    `,
  });

  try {
    await validate(tmpPath);
  } catch (err) {
    expect(err).toMatchInlineSnapshot(
      `[Error: the dist directory isn't included in the published files for this package, please add it to the files field in the package's package.json]`
    );
    return;
  }
  expect(true).toBe(false);
});

test("entrypoint not included in package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "entrypoint-not-included-in-pkg",
      main: "dist/entrypoint-not-included-in-pkg.cjs.js",
      module: "dist/entrypoint-not-included-in-pkg.esm.js",

      preconstruct: {
        source: "src/sum",
        entrypoints: [".", "multiply"],
      },

      files: ["dist"],
    }),

    "multiply/package.json": JSON.stringify({
      main: "dist/entrypoint-not-included-in-pkg.cjs.js",
      module: "dist/entrypoint-not-included-in-pkg.esm.js",

      preconstruct: {
        source: "../src/multiply.js",
      },
    }),

    "src/multiply.js": js`
                         export let multiply = (a, b) => a * b;
                       `,

    "src/sum.js": js`
                    export let sum = (a, b) => a + b;
                  `,
  });

  try {
    await validate(tmpPath);
  } catch (err) {
    expect(err).toMatchInlineSnapshot(
      `[Error: the entrypoint multiply isn't included in the published files for this package, please add it to the files field in the package's package.json]`
    );
    return;
  }
  expect(true).toBe(false);
});

test("root dist directory not included in package without entrypoint at root", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      files: ["other"],
      preconstruct: {
        entrypoints: ["other.js"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: { newEntrypoints: true },
      },
    }),
    "other/package.json": JSON.stringify({
      main: "dist/pkg-a.cjs.js",
    }),
    "src/other.js": js`
                      export let x = true;
                    `,
  });

  await expect(validate(tmpPath)).rejects.toMatchInlineSnapshot(`
          [Error: the dist directory in the root of the package isn't included in the published files for this package, please add it to the files field in the package's package.json.
          though this package does not have an entrypoint at the root of the package, preconstruct will write common chunks to the root dist directory so it must be included.]
        `);
});

test("new entrypoints with old config", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg",
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",
      preconstruct: {
        source: "src/sum",
        entrypoints: [".", "multiply"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: { newEntrypoints: true },
      },
    }),

    "multiply/package.json": JSON.stringify({
      main: "dist/pkg.cjs.js",
      module: "dist/pkg.esm.js",

      preconstruct: {
        source: "../src/multiply.js",
      },
    }),

    "src/multiply.js": js`
                         export let multiply = (a, b) => a * b;
                       `,

    "src/sum.js": js`
                    export let sum = (a, b) => a + b;
                  `,
  });

  await expect(validate(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: this package has no entrypoints but it does have some using v1's entrypoints config, please see the the changelog for how to upgrade]`
  );
});

test.only("multiple source files for same entrypoint", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      preconstruct: {
        entrypoints: ["other.js", "other/index.js"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: { newEntrypoints: true },
      },
    }),
    "other/package.json": JSON.stringify({
      main: "dist/pkg-a.cjs.js",
    }),
    "src/other.js": js`
                      export let x = true;
                    `,
    "src/other/index.js": js`
                            export let x = true;
                          `,
  });

  await expect(validate(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: this package has multiple source files for the same entrypoint of pkg-a/other at src/other.js and src/other/index.js]`
  );
});
