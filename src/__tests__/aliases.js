// @flow
import { aliases } from "../index";
import fixturez from "fixturez";

const f = fixturez(__dirname);

test("jest aliases", () => {
  let tmpPath = f.find("monorepo-umd-with-dep");

  let jestAliases = aliases.jest(tmpPath);

  expect(Object.keys(jestAliases)).toHaveLength(2);

  expect(jestAliases).toEqual({
    "^@some-scope/package-one-umd-with-dep$": expect.stringContaining(
      "__fixtures__/monorepo-umd-with-dep/packages/package-one/src/index.js"
    ),
    "^@some-scope/package-two-umd-with-dep$": expect.stringContaining(
      "__fixtures__/monorepo-umd-with-dep/packages/package-two/src/index.js"
    )
  });
});
