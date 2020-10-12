import fixturez from "fixturez";
import path from "path";
import validate from "../validate";
import {
  logMock,
  modifyPkg,
  getPkg,
  install,
  testdir,
  js,
} from "../../test-utils";
import { FatalError } from "../errors";
import { errors, confirms as _confirms } from "../messages";

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
        "🎁 info valid-package package entrypoints are valid",
      ],
      Array [
        "🎁 success project is valid!",
      ],
    ]
  `);
});

test("no main field", async () => {
  let tmpPath = f.find("no-main-field");

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
        "🎁 info no-module package entrypoints are valid",
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

  try {
    await validate(tmpPath);
  } catch (e) {
    expect(e).toBeInstanceOf(FatalError);
    expect(e.message).toBe(
      errors.invalidField("browser", "invalid.js", {
        "./dist/no-module.cjs.js": "./dist/no-module.browser.cjs.js",
      })
    );
  }
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
        "🎁 info valid-package package entrypoints are valid",
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
        "🎁 info @some-scope/package-two-single-package package entrypoints are valid",
      ],
      Array [
        "🎁 success project is valid!",
      ],
    ]
  `);
});

test("one-entrypoint-with-browser-field-one-without", async () => {
  let tmpPath = f.copy("one-entrypoint-with-browser-field-one-without");
  try {
    await validate(tmpPath);
  } catch (e) {
    expect(e).toMatchInlineSnapshot(
      `[Error: one-entrypoint-with-browser-field-one-without has a browser build but one-entrypoint-with-browser-field-one-without/multiply does not have a browser build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.]`
    );
  }
});

test("create package.json for an entrypoint", async () => {
  let tmpPath = f.copy("entrypoint-pkg-json-missing");
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
  let tmpPath = f.copy("monorepo-umd-with-dep-incorrect-peerdeps");

  await install(tmpPath);

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
  let tmpPath = f.copy("dist-not-included-in-pkg");

  await install(tmpPath);

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
  let tmpPath = f.copy("entrypoint-not-included-in-pkg");

  await install(tmpPath);

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
