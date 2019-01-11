// @flow
import { aliases } from "../index";
import fixturez from "fixturez";

const f = fixturez(__dirname);

test("jest aliases", () => {
  let tmpPath = f.find("monorepo-umd-with-dep");

  let jestAliases = aliases.jest(tmpPath);

  expect(Object.keys(jestAliases)).toHaveLength(4);

  expect(jestAliases).toEqual({
    "^@some-scope/package-one-umd-with-dep$":
      "@some-scope/package-one-umd-with-dep/src/index.js",
    "^@some-scope/package-two-umd-with-dep$":
      "@some-scope/package-two-umd-with-dep/src/index.js",
    "^@some-scope/package-three-umd-with-dep$":
      "@some-scope/package-three-umd-with-dep/src/index.js",
    "^@some-scope/package-four-umd-with-dep$":
      "@some-scope/package-four-umd-with-dep/src/index.js"
  });
});
