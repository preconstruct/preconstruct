// @flow
import fixturez from "fixturez";
import validate from "../validate";
import { logMock } from "../../test-utils";
import { Package } from "../package";
import { FatalError } from "../errors";
import { errors } from "../messages";

const f = fixturez(__dirname);

afterEach(() => {
  jest.resetAllMocks();
});

test("reports correct result on valid package", async () => {
  let tmpPath = f.find("valid-package");

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "🎁 info valid-package",
    "a valid entry point exists.",
  ],
  Array [
    "🎁 info valid-package",
    "main field is valid",
  ],
  Array [
    "🎁 info valid-package",
    "module field is valid",
  ],
  Array [
    "🎁 info valid-package",
    "umd:main field is valid",
  ],
  Array [
    "🎁 success",
    "package is valid!",
  ],
]
`);
});

test("no module", async () => {
  let tmpPath = f.find("no-module");

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "🎁 info no-module",
    "a valid entry point exists.",
  ],
  Array [
    "🎁 info no-module",
    "main field is valid",
  ],
  Array [
    "🎁 success",
    "package is valid!",
  ],
]
`);
});

test("invalid browser", async () => {
  let tmpPath = f.copy("no-module");

  let pkg = await Package.create(tmpPath);

  pkg.browser = "invalid.js";

  await pkg.save();
  try {
    await validate(tmpPath);
  } catch (e) {
    expect(e).toBeInstanceOf(FatalError);
    expect(e.message).toBe(errors.invalidBrowserField);
  }
});

test("valid browser", async () => {
  let tmpPath = f.copy("valid-package");

  let pkg = await Package.create(tmpPath);

  pkg.browser = {
    ["./dist/valid-package.cjs.js"]: "./dist/valid-package.browser.cjs.js",
    ["./dist/valid-package.esm.js"]: "./dist/valid-package.browser.esm.js"
  };

  await pkg.save();

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "🎁 info valid-package",
    "a valid entry point exists.",
  ],
  Array [
    "🎁 info valid-package",
    "main field is valid",
  ],
  Array [
    "🎁 info valid-package",
    "module field is valid",
  ],
  Array [
    "🎁 info valid-package",
    "umd:main field is valid",
  ],
  Array [
    "🎁 info valid-package",
    "browser field is valid",
  ],
  Array [
    "🎁 success",
    "package is valid!",
  ],
]
`);
});
