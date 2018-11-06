// @flow
const f = require("fixturez")(__dirname);
let path = require("path");
let fs = require("fs-extra");
const init = require("../src/init");
let prompt /*: any */ = require("../src/prompt");

let unsafeRequire = require;

async function getPkg(filepath) {
  return JSON.parse(
    await fs.readFile(path.join(filepath, "package.json"), "utf-8")
  );
}

jest.mock("../src/prompt");

afterEach(() => {
  jest.resetAllMocks();
});

test("no entrypoint", async () => {
  let tmpPath = f.copy("no-entrypoint");
  try {
    await init(tmpPath);
  } catch (error) {
    expect(error.message).toBe(init.errors.noEntryPoint);
  }
});

test("do not allow write", async () => {
  let tmpPath = f.copy("basic-package");

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case init.confirms.writeMainField: {
        return false;
      }
      default: {
        throw new Error("unexpected case: " + question);
      }
    }
  });
  try {
    await init(tmpPath);
  } catch (error) {
    expect(error.message).toBe(init.errors.deniedWriteMainField);
  }
  expect(prompt.promptConfirm).toBeCalledTimes(1);
});

test("set only main field", async () => {
  let tmpPath = f.copy("basic-package");

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case init.confirms.writeMainField: {
        return true;
      }
      case init.confirms.writeModuleField: {
        return false;
      }
      default: {
        throw new Error("unexpected case: " + question);
      }
    }
  });

  await init(tmpPath);
  expect(prompt.promptConfirm).toBeCalledTimes(2);
  let pkg = await getPkg(tmpPath);
  expect(pkg).toMatchInlineSnapshot(`
Object {
  "license": "MIT",
  "main": "dist/basic-package.cjs.js",
  "name": "basic-package",
  "private": true,
  "version": "1.0.0",
}
`);
});

test("set main and module field", async () => {
  let tmpPath = f.copy("basic-package");

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case init.confirms.writeMainField: {
        return true;
      }
      case init.confirms.writeModuleField: {
        return true;
      }
      default: {
        throw new Error("unexpected case: " + question);
      }
    }
  });

  await init(tmpPath);
  expect(prompt.promptConfirm).toBeCalledTimes(2);
  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
Object {
  "license": "MIT",
  "main": "dist/basic-package.cjs.js",
  "module": "dist/basic-package.esm.js",
  "name": "basic-package",
  "private": true,
  "version": "1.0.0",
}
`);
});

test("scoped package", async () => {
  let tmpPath = f.copy("scoped");

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case init.confirms.writeMainField: {
        return true;
      }
      case init.confirms.writeModuleField: {
        return true;
      }
      default: {
        throw new Error("unexpected case: " + question);
      }
    }
  });

  await init(tmpPath);
  expect(prompt.promptConfirm).toBeCalledTimes(2);
  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
Object {
  "license": "MIT",
  "main": "dist/some-package.cjs.js",
  "module": "dist/some-package.esm.js",
  "name": "@some-scope/some-package",
  "private": true,
  "version": "1.0.0",
}
`);
});
