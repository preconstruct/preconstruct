// @flow
import fixturez from "fixturez";
import validate from "../validate";
import { logMock } from "../../test-utils";

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
