import path from "path";
import build from "../";
import fixturez from "fixturez";
import * as fs from "fs-extra";
import { snapshotDistFiles, snapshotDirectory } from "../../../test-utils";
import globby from "globby";

const f = fixturez(__dirname);

jest.setTimeout(6000000);

jest.mock("../../prompt");

let unsafeRequire = require;

test("basic", async () => {
  let tmpPath = f.copy("valid-package");

  await build(tmpPath);

  await snapshotDistFiles(tmpPath);

  expect(unsafeRequire(tmpPath).default).toBe("something");
});

test("typescript thing", async () => {
  let tmpPath = f.find("weird-typescript-thing");
  await build(tmpPath);

  await snapshotDirectory(path.join(tmpPath, "dist"), { files: "all" });
});

async function testdir(dir: { [key: string]: string }) {
  const temp = f.temp();
  await Promise.all(
    Object.keys(dir).map((filename) => {
      fs.outputFile(path.join(temp, filename), dir[filename]);
    })
  );
  return temp;
}

async function getDist(dir: string) {
  const files = await globby(["dist/**/*"], { cwd: dir });
  const filesObj: Record<string, string> = {};
  await Promise.all(
    files.map(async (filename) => {
      filesObj[filename] = await fs.readFile(path.join(dir, filename), "utf8");
    })
  );
}

test("process.env.NODE_ENV reassignment", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
    }),
    "src/index.js": "process.env.NODE_ENV = 'development'",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot();
});
