// @flow
import fixturez from "fixturez";
import validate from "../validate";
import { logMock } from "../../test-utils";
import { Entrypoint } from "../entrypoint";
import { FatalError } from "../errors";
import { errors } from "../messages";

const f = fixturez(__dirname);

jest.mock("../prompt");

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

  let entrypoint = await Entrypoint.create(tmpPath);

  entrypoint.browser = "invalid.js";

  await entrypoint.save();
  try {
    await validate(tmpPath);
  } catch (e) {
    expect(e).toBeInstanceOf(FatalError);
    expect(e.message).toBe(errors.invalidBrowserField);
  }
});

test("valid browser", async () => {
  let tmpPath = f.copy("valid-package");

  let entrypoint = await Entrypoint.create(tmpPath);

  entrypoint.browser = {
    ["./dist/valid-package.cjs.js"]: "./dist/valid-package.browser.cjs.js",
    ["./dist/valid-package.esm.js"]: "./dist/valid-package.browser.esm.js"
  };

  await entrypoint.save();

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

test("valid react-native", async () => {
  let tmpPath = f.copy("with-react-native-field");

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "🎁 info with-react-native-field",
    "a valid entry point exists.",
  ],
  Array [
    "🎁 info with-react-native-field",
    "main field is valid",
  ],
  Array [
    "🎁 info with-react-native-field",
    "module field is valid",
  ],
  Array [
    "🎁 info with-react-native-field",
    "react-native field is valid",
  ],
  Array [
    "🎁 success",
    "package is valid!",
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
    "🎁 info @some-scope/package-two-single-package",
    "a valid entry point exists.",
  ],
  Array [
    "🎁 info @some-scope/package-two-single-package",
    "main field is valid",
  ],
  Array [
    "🎁 success",
    "package is valid!",
  ],
]
`);
});
