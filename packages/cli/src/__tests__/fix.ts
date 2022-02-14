import fixturez from "fixturez";
import fix from "../fix";
import path from "path";
import { confirms as _confirms, inputs } from "../messages";
import {
  getPkg,
  modifyPkg,
  logMock,
  createPackageCheckTestCreator,
  testdir,
  js,
} from "../../test-utils";
import { promptInput as _promptInput } from "../prompt";
import fs from "fs-extra";

const f = fixturez(__dirname);

jest.mock("../prompt");

let confirms = _confirms as jest.Mocked<typeof _confirms>;

let promptInput = _promptInput as jest.MockedFunction<typeof _promptInput>;

let testFix = createPackageCheckTestCreator(fix);

afterEach(() => {
  jest.resetAllMocks();
});

test("no entrypoint", async () => {
  let tmpPath = f.copy("no-entrypoint");
  await expect(fix(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: packages must have at least one entrypoint, this package has no entrypoints]`
  );
});

test("only main", async () => {
  let tmpPath = f.copy("no-module");
  confirms.writeMainField.mockReturnValue(Promise.resolve(true));
  let origJson = await getPkg(tmpPath);
  await modifyPkg(tmpPath, (json) => {
    json.main = "bad";
  });

  await fix(tmpPath);

  expect(origJson).toEqual(await getPkg(tmpPath));
});

test("set main and module field", async () => {
  let tmpPath = f.copy("basic-package");

  await modifyPkg(tmpPath, (json) => {
    json.module = "bad.js";
  });

  await fix(tmpPath);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    Object {
      "name": "basic-package",
      "version": "1.0.0",
      "main": "dist/basic-package.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/basic-package.esm.js",
    }
  `);
});

test("set exports field when opt-in", async () => {
  let tmpPath = f.copy("package-exports");

  await modifyPkg(tmpPath, (json) => {
    json.exports = { ".": { browser: {}, worker: {} } };
  });

  await fix(tmpPath);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    Object {
      "name": "package-exports",
      "version": "1.0.0",
      "main": "dist/package-exports.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/package-exports.esm.js",
      "preconstruct": Object {
        "exports": true,
      },
      "exports": Object {
        "./package.json": "./package.json",
        ".": Object {
          "worker": Object {
            "production": Object {
              "module": "./dist/package-exports.worker.esm.prod.js",
              "default": "./dist/package-exports.worker.cjs.prod.js",
            },
            "module": "./dist/package-exports.worker.esm.dev.js",
            "default": "./dist/package-exports.worker.cjs.js",
          },
          "browser": Object {
            "production": Object {
              "module": "./dist/package-exports.browser.esm.prod.js",
              "default": "./dist/package-exports.browser.cjs.prod.js",
            },
            "module": "./dist/package-exports.browser.esm.dev.js",
            "default": "./dist/package-exports.browser.cjs.js",
          },
          "production": Object {
            "module": "./dist/package-exports.esm.prod.js",
            "default": "./dist/package-exports.cjs.prod.js",
          },
          "module": "./dist/package-exports.esm.dev.js",
          "default": "./dist/package-exports.cjs.js",
        },
      },
    }
  `);
});

test("new dist filenames", async () => {
  let tmpPath = f.copy("basic-package");

  await modifyPkg(tmpPath, (json) => {
    json.name = "@scope/something";
    json.main = "bad.js";
    json.module = "bad.js";
  });

  await fix(tmpPath);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    Object {
      "name": "@scope/something",
      "version": "1.0.0",
      "main": "dist/scope-something.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/scope-something.esm.js",
    }
  `);
});

test("new dist filenames only-unscoped-package-name strategy", async () => {
  let tmpPath = f.copy("basic-package");

  await modifyPkg(tmpPath, (json) => {
    json.name = "@scope/something";
    json.preconstruct = {
      distFilenameStrategy: "unscoped-package-name",
    };
    json.main = "bad.js";
    json.module = "bad.js";
  });

  await fix(tmpPath);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    Object {
      "name": "@scope/something",
      "version": "1.0.0",
      "main": "dist/something.cjs.js",
      "license": "MIT",
      "private": true,
      "preconstruct": Object {
        "distFilenameStrategy": "unscoped-package-name",
      },
      "module": "dist/something.esm.js",
    }
  `);
});

test("monorepo", async () => {
  let tmpPath = f.copy("monorepo");

  for (let name of ["package-one", "package-two"]) {
    await modifyPkg(path.join(tmpPath, "packages", name), (pkg) => {
      pkg.module = "bad.js";
    });
  }

  await fix(tmpPath);

  let pkg1 = await getPkg(path.join(tmpPath, "packages", "package-one"));
  let pkg2 = await getPkg(path.join(tmpPath, "packages", "package-two"));

  expect(pkg1).toMatchInlineSnapshot(`
    Object {
      "name": "@some-scope/package-one",
      "version": "1.0.0",
      "main": "dist/some-scope-package-one.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/some-scope-package-one.esm.js",
    }
  `);

  expect(pkg2).toMatchInlineSnapshot(`
    Object {
      "name": "@some-scope/package-two",
      "version": "1.0.0",
      "main": "dist/some-scope-package-two.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/some-scope-package-two.esm.js",
    }
  `);
});

test("does not modify if already valid", async () => {
  let tmpPath = f.copy("valid-package");
  let original = await getPkg(tmpPath);

  await fix(tmpPath);
  let current = await getPkg(tmpPath);
  expect(original).toEqual(current);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "🎁 success project already valid!",
      ],
    ]
  `);
});

test("invalid fields", async () => {
  let tmpPath = f.copy("invalid-fields");

  await fix(tmpPath);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
    Object {
      "name": "invalid-fields",
      "version": "1.0.0",
      "main": "dist/invalid-fields.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/invalid-fields.esm.js",
    }
  `);
});

test("fix browser", async () => {
  let tmpPath = f.copy("valid-package");

  await modifyPkg(tmpPath, (pkg) => {
    pkg.browser = "bad.js";
  });

  await fix(tmpPath);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    Object {
      "name": "valid-package",
      "version": "1.0.0",
      "main": "dist/valid-package.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/valid-package.esm.js",
      "umd:main": "dist/valid-package.umd.min.js",
      "preconstruct": Object {
        "umdName": "validPackage",
      },
      "browser": Object {
        "./dist/valid-package.cjs.js": "./dist/valid-package.browser.cjs.js",
        "./dist/valid-package.esm.js": "./dist/valid-package.browser.esm.js",
      },
    }
  `);
});

test("monorepo single package", async () => {
  let tmpPath = f.copy("monorepo-single-package");

  await fix(tmpPath);
  expect(logMock.log.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "🎁 success project already valid!",
      ],
    ]
  `);
});

testFix(
  "umd:main but no umdName specified",
  {
    "": {
      name: "something",
      main: "dist/something.cjs.js",
      "umd:main": "will be fixed",
    },
  },
  async (run) => {
    promptInput.mockImplementation(async (message, item) => {
      expect(message).toBe(inputs.getUmdName);
      expect(item.name).toBe("something");
      return "somethingUmdName";
    });

    let contents = await run();

    expect(contents).toMatchInlineSnapshot(`
      Object {
        "": Object {
          "name": "something",
          "main": "dist/something.cjs.js",
          "umd:main": "dist/something.umd.min.js",
          "preconstruct": Object {
            "umdName": "somethingUmdName",
          },
        },
      }
    `);
    expect(contents[""].preconstruct.umdName).toBe("somethingUmdName");
    expect(contents[""]["umd:main"]).toBe("dist/something.umd.min.js");

    expect(promptInput).toBeCalledTimes(1);
  }
);

test("create entrypoint", async () => {
  let tmpPath = f.copy("valid-package");
  await fs.writeFile(
    path.join(tmpPath, "src", "another.js"),
    "export let x = 1"
  );

  let x = 0;

  promptInput.mockImplementation(async (message, { name }, defaultAnswer) => {
    if (x === 0) {
      expect(message).toBe(inputs.getUmdName);
      expect(name).toBe("valid-package/another");
      return "another";
    }
    throw new Error("unexpected call");
  });

  await modifyPkg(tmpPath, (pkg) => {
    pkg.preconstruct.entrypoints = ["index.js", "another.js"];
  });
  await fix(tmpPath);

  expect(promptInput).toBeCalledTimes(1);

  expect(
    await fs.readFile(path.join(tmpPath, "another", "package.json"), "utf8")
  ).toMatchInlineSnapshot(`
    "{
      \\"main\\": \\"dist/valid-package-another.cjs.js\\",
      \\"module\\": \\"dist/valid-package-another.esm.js\\",
      \\"umd:main\\": \\"dist/valid-package-another.umd.min.js\\",
      \\"preconstruct\\": {
        \\"umdName\\": \\"another\\"
      }
    }
    "
  `);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    Object {
      "name": "valid-package",
      "version": "1.0.0",
      "main": "dist/valid-package.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/valid-package.esm.js",
      "umd:main": "dist/valid-package.umd.min.js",
      "preconstruct": Object {
        "umdName": "validPackage",
        "entrypoints": Array [
          "index.js",
          "another.js",
        ],
      },
    }
  `);
});

test("create entrypoint no umd/no prompts", async () => {
  let tmpPath = f.copy("valid-package");
  await fs.writeFile(
    path.join(tmpPath, "src", "another.js"),
    "export let x = 1"
  );
  await modifyPkg(tmpPath, (pkg) => {
    delete pkg["umd:main"];
    pkg.preconstruct.entrypoints = ["index.js", "another.js"];
  });
  await fix(tmpPath);

  expect(await getPkg(path.join(tmpPath, "another"))).toMatchInlineSnapshot(`
    Object {
      "main": "dist/valid-package-another.cjs.js",
      "module": "dist/valid-package-another.esm.js",
    }
  `);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    Object {
      "name": "valid-package",
      "version": "1.0.0",
      "main": "dist/valid-package.cjs.js",
      "license": "MIT",
      "private": true,
      "module": "dist/valid-package.esm.js",
      "preconstruct": Object {
        "umdName": "validPackage",
        "entrypoints": Array [
          "index.js",
          "another.js",
        ],
      },
    }
  `);
});

test("unexpected experimental flag throws, not removes", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          thisDoesNotExist: true,
        },
      },
    }),
    "src/index.js": js`
                      export let x = true;
                    `,
  });

  await expect(fix(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: 🎁 pkg-a The experimental flag "thisDoesNotExist" in your config does not exist]`
  );
});

test("unexpected former experimental flag is removed", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          newEntrypoints: true,
        },
      },
    }),
    "src/index.js": js`
                      export let x = true;
                    `,
  });

  await expect(fix(tmpPath));
  expect(getPkg(tmpPath)).toMatchInlineSnapshot(`Promise {}`);
});
