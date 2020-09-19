import path from "path";
import build from "../";
import fixturez from "fixturez";
import {
  snapshotDistFiles,
  snapshotDirectory,
  testdir,
  getDist,
} from "../../../test-utils";

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

test("process.env.NODE_ENV reassignment", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
    }),
    "src/index.js": "process.env.NODE_ENV = 'development'",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
      dist/test.cjs.dev.js -------------
      'use strict';
      
      process.env.NODE_ENV = 'development';
      
      dist/test.cjs.js -------------
      'use strict';
      
      if (process.env.NODE_ENV === "production") {
        module.exports = require("./test.cjs.prod.js");
      } else {
        module.exports = require("./test.cjs.dev.js");
      }
      
      dist/test.cjs.prod.js -------------
      "use strict";
      
      process.env.NODE_ENV = "development";
      
  `);
});
