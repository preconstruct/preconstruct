// @flow
import fixturez from "fixturez";
import path from "path";
import * as fs from "fs-extra";
import init from "../init";
import { infos, confirms, errors } from "../messages";
import { logMock } from "../../test-utils";

let prompt: any = require("../prompt");

const f = fixturez(__dirname);

let unsafeRequire = require;

async function getPkg(filepath) {
  return JSON.parse(
    await fs.readFile(path.join(filepath, "package.json"), "utf-8")
  );
}

jest.mock("../prompt");

afterEach(() => {
  jest.resetAllMocks();
});

test("no entrypoint", async () => {
  let tmpPath = f.copy("no-entrypoint");
  try {
    await init(tmpPath);
  } catch (error) {
    expect(error.message).toBe(errors.noEntryPoint);
  }
});

test("do not allow write", async () => {
  let tmpPath = f.copy("basic-package");

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case confirms.writeMainField: {
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
    expect(error.message).toBe(errors.deniedWriteMainField);
  }
  expect(prompt.promptConfirm).toBeCalledTimes(1);
});

test("set only main field", async () => {
  let tmpPath = f.copy("basic-package");

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case confirms.writeMainField: {
        return true;
      }
      case confirms.writeModuleField: {
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
      case confirms.writeMainField: {
        return true;
      }
      case confirms.writeModuleField: {
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
      case confirms.writeMainField: {
        return true;
      }
      case confirms.writeModuleField: {
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

test("monorepo", async () => {
  let tmpPath = f.copy("monorepo");
  // throw await globby(["packages/*"], {
  //   cwd: tmpPath,
  //   onlyDirectories: true
  // });

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case confirms.writeMainField: {
        return true;
      }
      case confirms.writeModuleField: {
        return true;
      }
      default: {
        throw new Error("unexpected case: " + question);
      }
    }
  });

  await init(tmpPath);
  expect(prompt.promptConfirm).toBeCalledTimes(4);
  let pkg1 = await getPkg(path.join(tmpPath, "packages", "package-one"));
  let pkg2 = await getPkg(path.join(tmpPath, "packages", "package-two"));

  expect(pkg1).toMatchInlineSnapshot(`
Object {
  "license": "MIT",
  "main": "dist/package-one.cjs.js",
  "module": "dist/package-one.esm.js",
  "name": "@some-scope/package-one",
  "private": true,
  "version": "1.0.0",
}
`);

  expect(pkg2).toMatchInlineSnapshot(`
Object {
  "license": "MIT",
  "main": "dist/package-two.cjs.js",
  "module": "dist/package-two.esm.js",
  "name": "@some-scope/package-two",
  "private": true,
  "version": "1.0.0",
}
`);
});

test("does not prompt or modify if already valid", async () => {
  let tmpPath = f.copy("valid-package");
  let original = await getPkg(tmpPath);

  await init(tmpPath);
  let current = await getPkg(tmpPath);
  expect(original).toEqual(current);
  expect(prompt.promptConfirm).not.toBeCalled();
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "🎁 info valid-package",
    "main field is valid",
  ],
  Array [
    "🎁 info valid-package",
    "module field is valid",
  ],
  Array [
    "🎁 success",
    "Initialised package!",
  ],
]
`);
});

test("invalid fields", async () => {
  let tmpPath = f.copy("invalid-fields");

  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case confirms.writeMainField: {
        return true;
      }
      case confirms.writeModuleField: {
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
  "main": "dist/invalid-fields.cjs.js",
  "module": "dist/invalid-fields.esm.js",
  "name": "invalid-fields",
  "private": true,
  "version": "1.0.0",
}
`);
});
