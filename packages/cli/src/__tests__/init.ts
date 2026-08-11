import assert from "node:assert/strict";
import path from "path";
import init from "../init";
import { errors } from "../messages";
import {
  logMock,
  modifyPkg,
  getPkg,
  js,
  testdir,
  getFiles,
  fixtures,
  setConfirm,
  stub,
} from "../../test-utils";

test("no entrypoint", async () => {
  let tmpPath = await testdir(fixtures.noEntrypoint);
  setConfirm("writeModuleField", async () => false);
  try {
    await init(tmpPath);
  } catch (error) {
    assert.strictEqual(error.message, errors.noSource("src/index"));
  }
});

test("do not allow write", async () => {
  let tmpPath = await testdir(fixtures.basicPackage);

  let writeMainField = stub(async () => false);
  setConfirm("writeMainField", writeMainField.handler);

  try {
    await init(tmpPath);
  } catch (error) {
    assert.strictEqual(error.message, errors.deniedWriteMainField);
  }
  assert.strictEqual(writeMainField.calls.length, 1);
});

test("set only main field", async () => {
  let tmpPath = await testdir(fixtures.basicPackage);

  let writeMainField = stub(async () => true);
  let writeModuleField = stub(async () => false);
  setConfirm("writeMainField", writeMainField.handler);
  setConfirm("writeModuleField", writeModuleField.handler);

  await init(tmpPath);
  assert.strictEqual(writeMainField.calls.length, 1);
  assert.strictEqual(writeModuleField.calls.length, 1);

  let pkg = await getPkg(tmpPath);
  expect(pkg).toMatchInlineSnapshot(`
    {
      "main": "dist/basic-package.cjs.js",
      "name": "basic-package",
    }
  `);
});

test("set main and module field", async () => {
  let tmpPath = await testdir(fixtures.basicPackage);

  let writeMainField = stub(async () => true);
  let writeModuleField = stub(async () => true);
  setConfirm("writeMainField", writeMainField.handler);
  setConfirm("writeModuleField", writeModuleField.handler);

  await init(tmpPath);
  assert.strictEqual(writeMainField.calls.length, 1);
  assert.strictEqual(writeModuleField.calls.length, 1);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    {
      "main": "dist/basic-package.cjs.js",
      "module": "dist/basic-package.esm.js",
      "name": "basic-package",
    }
  `);
});

test("scoped package", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "@some-scope/some-package",
      version: "1.0.0",
      main: "index.js",
      license: "MIT",
      private: true,
    }),

    "src/index.js": js`
      // @flow

      export default "something";
    `,
  });

  let writeMainField = stub(async () => true);
  let writeModuleField = stub(async () => true);
  setConfirm("writeMainField", writeMainField.handler);
  setConfirm("writeModuleField", writeModuleField.handler);

  await init(tmpPath);
  assert.strictEqual(writeMainField.calls.length, 1);
  assert.strictEqual(writeModuleField.calls.length, 1);
  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    {
      "license": "MIT",
      "main": "dist/some-scope-some-package.cjs.js",
      "module": "dist/some-scope-some-package.esm.js",
      "name": "@some-scope/some-package",
      "private": true,
      "version": "1.0.0",
    }
  `);
});

test("monorepo", async () => {
  let tmpPath = await testdir(fixtures.monorepo);

  let writeMainField = stub(async () => true);
  let writeModuleField = stub(async () => true);
  setConfirm("writeMainField", writeMainField.handler);
  setConfirm("writeModuleField", writeModuleField.handler);

  await init(tmpPath);
  assert.strictEqual(writeMainField.calls.length, 2);
  assert.strictEqual(writeModuleField.calls.length, 2);

  let pkg1 = await getPkg(path.join(tmpPath, "packages", "package-one"));
  let pkg2 = await getPkg(path.join(tmpPath, "packages", "package-two"));

  expect(Object.keys(pkg1)).toMatchInlineSnapshot(`
    [
      "name",
      "main",
      "module",
    ]
  `);

  expect(pkg1).toMatchInlineSnapshot(`
    {
      "main": "dist/some-scope-package-one.cjs.js",
      "module": "dist/some-scope-package-one.esm.js",
      "name": "@some-scope/package-one",
    }
  `);

  expect(pkg2).toMatchInlineSnapshot(`
    {
      "main": "dist/some-scope-package-two.cjs.js",
      "module": "dist/some-scope-package-two.esm.js",
      "name": "@some-scope/package-two",
    }
  `);
});

test("does not prompt or modify if already valid", async () => {
  let tmpPath = await testdir(fixtures.validPackage);
  let original = await getPkg(tmpPath);

  await init(tmpPath);
  let current = await getPkg(tmpPath);
  assert.deepEqual(original, current);
  expect(logMock.log.calls).toMatchInlineSnapshot(`
    [
      [
        "🎁 info valid-package main field is valid",
      ],
      [
        "🎁 info valid-package module field is valid",
      ],
      [
        "🎁 success initialised project!",
      ],
    ]
  `);
});

test("invalid fields", async () => {
  let tmpPath = await testdir(fixtures.invalidFields);

  let writeMainField = stub(async () => true);
  let writeModuleField = stub(async () => true);
  setConfirm("writeMainField", writeMainField.handler);
  setConfirm("writeModuleField", writeModuleField.handler);

  await init(tmpPath);

  assert.strictEqual(writeMainField.calls.length, 1);
  assert.strictEqual(writeModuleField.calls.length, 1);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    {
      "main": "dist/invalid-fields.cjs.js",
      "module": "dist/invalid-fields.esm.js",
      "name": "invalid-fields",
    }
  `);
});

test("fix browser", async () => {
  let tmpPath = await testdir(fixtures.validPackage);

  setConfirm("fixBrowserField", async () => true);

  await modifyPkg(tmpPath, (pkg) => {
    pkg.browser = "invalid.js";
  });

  await init(tmpPath);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    {
      "browser": {
        "./dist/valid-package.cjs.js": "./dist/valid-package.browser.cjs.js",
        "./dist/valid-package.esm.js": "./dist/valid-package.browser.esm.js",
      },
      "main": "dist/valid-package.cjs.js",
      "module": "dist/valid-package.esm.js",
      "name": "valid-package",
      "preconstruct": {
        "umdName": "validPackage",
      },
      "umd:main": "dist/valid-package.umd.min.js",
    }
  `);
});

let basicThreeEntrypoints = {
  "package.json": JSON.stringify({
    name: "something",
    preconstruct: {
      entrypoints: ["index.js", "one.js", "two.js"],
    },
  }),
  "src/index.js": js`
    export let something = true;
  `,
  "src/one.js": js`
    export let something = true;
  `,
  "src/two.js": js`
    export let something = true;
  `,
  "one/package.json": JSON.stringify({}),
  "two/package.json": JSON.stringify({}),
};

test("three entrypoints, no main, only add main", async () => {
  const dir = await testdir(basicThreeEntrypoints);
  setConfirm("writeMainField", async () => true);
  setConfirm("writeModuleField", async () => false);

  await init(dir);

  expect(await getFiles(dir, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ one/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-one.cjs.js"
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "something",
      "preconstruct": {
        "entrypoints": [
          "index.js",
          "one.js",
          "two.js"
        ]
      },
      "main": "dist/something.cjs.js"
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ two/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-two.cjs.js"
    }

  `);
});

test("three entrypoints, no main, add main and module", async () => {
  const dir = await testdir(basicThreeEntrypoints);

  setConfirm("writeMainField", async () => true);
  setConfirm("writeModuleField", async () => true);

  await init(dir);

  expect(await getFiles(dir, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ one/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-one.cjs.js",
      "module": "dist/something-one.esm.js"
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "something",
      "preconstruct": {
        "entrypoints": [
          "index.js",
          "one.js",
          "two.js"
        ]
      },
      "main": "dist/something.cjs.js",
      "module": "dist/something.esm.js"
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ two/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-two.cjs.js",
      "module": "dist/something-two.esm.js"
    }

  `);
});

test("three entrypoints, no main, add main and fix browser", async () => {
  const dir = await testdir({
    ...basicThreeEntrypoints,
    "package.json": JSON.stringify({
      ...JSON.parse(basicThreeEntrypoints["package.json"]),
      browser: "",
    }),
  });
  setConfirm("writeMainField", async () => true);
  setConfirm("writeModuleField", async () => false);
  setConfirm("fixBrowserField", async () => true);

  await init(dir);

  expect(await getFiles(dir, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ one/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-one.cjs.js",
      "browser": {
        "./dist/something-one.cjs.js": "./dist/something-one.browser.cjs.js"
      }
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "something",
      "preconstruct": {
        "entrypoints": [
          "index.js",
          "one.js",
          "two.js"
        ]
      },
      "browser": {
        "./dist/something.cjs.js": "./dist/something.browser.cjs.js"
      },
      "main": "dist/something.cjs.js"
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ two/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-two.cjs.js",
      "browser": {
        "./dist/something-two.cjs.js": "./dist/something-two.browser.cjs.js"
      }
    }

  `);
});
