// @flow
import fixturez from "fixturez";
import spawn from "spawndamnit";
import path from "path";
import { install } from "../../test-utils";
import dev from "../dev";

const f = fixturez(__dirname);

jest.mock("../prompt");

test("dev command works in node", async () => {
  let tmpPath = f.copy("valid-monorepo-that-logs-stuff");

  await install(tmpPath);

  await dev(tmpPath);

  // i would require it but i don't want jest to do magical things
  let { code, stdout, stderr } = await spawn("node", [
    path.join(tmpPath, "packages", "package-one")
  ]);
  expect(code).toBe(0);
  expect(
    stdout
      .toString()
      .trim()
      .split("\n")
  ).toEqual([
    "message from package two",
    "message from package one",
    "message from package two but logged by package one"
  ]);
  expect(stdout.toString()).toMatchInlineSnapshot(`
"message from package two
message from package one
message from package two but logged by package one
"
`);
  expect(stderr.toString()).toBe("");
});

// TODO: test for ESM one
// maybe run parcel inside of jest because why not
