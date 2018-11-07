// @flow
import fixturez from "fixturez";
import validate from "../validate";
import { logMock } from "../../test-utils";

const f = fixturez(__dirname);

test("reports correct result on valid package", async () => {
  let tmpPath = f.find("valid-package");

  await validate(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "🎁 info valid-package ",
    "a valid entry point exists.",
  ],
  Array [
    "🎁 info valid-package ",
    "main field is valid. No change required",
  ],
  Array [
    "🎁 info valid-package ",
    "module field is valid. No change required",
  ],
  Array [
    "🎁 success ",
    "package is valid!",
  ],
]
`);
});
