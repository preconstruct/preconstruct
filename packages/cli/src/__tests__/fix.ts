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
  getFiles,
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
      "license": "MIT",
      "main": "dist/basic-package.cjs.js",
      "module": "dist/basic-package.esm.js",
      "name": "basic-package",
      "private": true,
      "version": "1.0.0",
    }
  `);
});

test("set exports field when opt-in", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "package-exports",
      main: "index.js",
      module: "dist/package-exports.esm.js",
      preconstruct: {
        exports: {
          envConditions: ["worker", "browser"],
        },
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "src/index.js": "",
  });

  await fix(tmpPath);

  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "package-exports",
      "main": "dist/package-exports.cjs.js",
      "module": "dist/package-exports.esm.js",
      "browser": {
        "./dist/package-exports.esm.js": "./dist/package-exports.browser.esm.js"
      },
      "exports": {
        ".": {
          "module": {
            "worker": "./dist/package-exports.worker.esm.js",
            "browser": "./dist/package-exports.browser.esm.js",
            "default": "./dist/package-exports.esm.js"
          },
          "default": "./dist/package-exports.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": {
          "envConditions": [
            "worker",
            "browser"
          ]
        },
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("set exports field when opt-in", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "package-exports",
      main: "index.js",
      module: "dist/package-exports.esm.js",
      preconstruct: {
        exports: {
          envConditions: ["worker", "browser"],
        },
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "src/index.js": "",
  });

  await fix(tmpPath);

  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "package-exports",
      "main": "dist/package-exports.cjs.js",
      "module": "dist/package-exports.esm.js",
      "browser": {
        "./dist/package-exports.esm.js": "./dist/package-exports.browser.esm.js"
      },
      "exports": {
        ".": {
          "module": {
            "worker": "./dist/package-exports.worker.esm.js",
            "browser": "./dist/package-exports.browser.esm.js",
            "default": "./dist/package-exports.esm.js"
          },
          "default": "./dist/package-exports.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": {
          "envConditions": [
            "worker",
            "browser"
          ]
        },
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("set exports field when opt-in with no env conditions", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "package-exports",
      main: "index.js",
      module: "dist/package-exports.esm.js",
      preconstruct: {
        exports: true,
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "src/index.js": "",
  });

  await fix(tmpPath);

  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "package-exports",
      "main": "dist/package-exports.cjs.js",
      "module": "dist/package-exports.esm.js",
      "exports": {
        ".": {
          "module": "./dist/package-exports.esm.js",
          "default": "./dist/package-exports.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": true,
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("set exports field with multiple entrypoints", async () => {
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "@blah/something",
      main: "index.js",
      module: "dist/package-exports.esm.js",
      preconstruct: {
        entrypoints: ["index.js", "other.js", "deep/something.js"],
        exports: {
          envConditions: ["worker", "browser"],
        },
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "other/package.json": JSON.stringify({}),
    "deep/something/package.json": JSON.stringify({}),
    "src/index.js": "",
    "src/other.js": "",
    "src/deep/something.js": "",
  });

  await fix(tmpPath);

  expect(await getFiles(tmpPath, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ deep/something/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/blah-something-deep-something.cjs.js",
      "module": "dist/blah-something-deep-something.esm.js",
      "browser": {
        "./dist/blah-something-deep-something.esm.js": "./dist/blah-something-deep-something.browser.esm.js"
      }
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ other/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/blah-something-other.cjs.js",
      "module": "dist/blah-something-other.esm.js",
      "browser": {
        "./dist/blah-something-other.esm.js": "./dist/blah-something-other.browser.esm.js"
      }
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "@blah/something",
      "main": "dist/blah-something.cjs.js",
      "module": "dist/blah-something.esm.js",
      "browser": {
        "./dist/blah-something.esm.js": "./dist/blah-something.browser.esm.js"
      },
      "exports": {
        ".": {
          "module": {
            "worker": "./dist/blah-something.worker.esm.js",
            "browser": "./dist/blah-something.browser.esm.js",
            "default": "./dist/blah-something.esm.js"
          },
          "default": "./dist/blah-something.cjs.js"
        },
        "./other": {
          "module": {
            "worker": "./other/dist/blah-something-other.worker.esm.js",
            "browser": "./other/dist/blah-something-other.browser.esm.js",
            "default": "./other/dist/blah-something-other.esm.js"
          },
          "default": "./other/dist/blah-something-other.cjs.js"
        },
        "./deep/something": {
          "module": {
            "worker": "./deep/something/dist/blah-something-deep-something.worker.esm.js",
            "browser": "./deep/something/dist/blah-something-deep-something.browser.esm.js",
            "default": "./deep/something/dist/blah-something-deep-something.esm.js"
          },
          "default": "./deep/something/dist/blah-something-deep-something.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "entrypoints": [
          "index.js",
          "other.js",
          "deep/something.js"
        ],
        "exports": {
          "envConditions": [
            "worker",
            "browser"
          ]
        },
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("set exports field without root entrypoint", async () => {
  let tmpPath = await testdir({
    "package.json":
      JSON.stringify(
        {
          name: "@blah/something",
          preconstruct: {
            entrypoints: ["other.js"],
            exports: {
              envConditions: ["worker", "browser"],
            },
            ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
              exports: true,
            },
          },
        },
        null,
        2
      ) + "\n",
    "other/package.json": JSON.stringify({}),
    "src/other.js": "",
  });

  await fix(tmpPath);

  expect(await getFiles(tmpPath, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ other/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/blah-something-other.cjs.js",
      "module": "dist/blah-something-other.esm.js",
      "browser": {
        "./dist/blah-something-other.esm.js": "./dist/blah-something-other.browser.esm.js"
      }
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "@blah/something",
      "preconstruct": {
        "entrypoints": [
          "other.js"
        ],
        "exports": {
          "envConditions": [
            "worker",
            "browser"
          ]
        },
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      },
      "exports": {
        "./other": {
          "module": {
            "worker": "./other/dist/blah-something-other.worker.esm.js",
            "browser": "./other/dist/blah-something-other.browser.esm.js",
            "default": "./other/dist/blah-something-other.esm.js"
          },
          "default": "./other/dist/blah-something-other.cjs.js"
        },
        "./package.json": "./package.json"
      }
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
      "license": "MIT",
      "main": "dist/scope-something.cjs.js",
      "module": "dist/scope-something.esm.js",
      "name": "@scope/something",
      "private": true,
      "version": "1.0.0",
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
      "license": "MIT",
      "main": "dist/something.cjs.js",
      "module": "dist/something.esm.js",
      "name": "@scope/something",
      "preconstruct": Object {
        "distFilenameStrategy": "unscoped-package-name",
      },
      "private": true,
      "version": "1.0.0",
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
      "license": "MIT",
      "main": "dist/some-scope-package-one.cjs.js",
      "module": "dist/some-scope-package-one.esm.js",
      "name": "@some-scope/package-one",
      "private": true,
      "version": "1.0.0",
    }
  `);

  expect(pkg2).toMatchInlineSnapshot(`
    Object {
      "license": "MIT",
      "main": "dist/some-scope-package-two.cjs.js",
      "module": "dist/some-scope-package-two.esm.js",
      "name": "@some-scope/package-two",
      "private": true,
      "version": "1.0.0",
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
      "license": "MIT",
      "main": "dist/invalid-fields.cjs.js",
      "module": "dist/invalid-fields.esm.js",
      "name": "invalid-fields",
      "private": true,
      "version": "1.0.0",
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
      "browser": Object {
        "./dist/valid-package.cjs.js": "./dist/valid-package.browser.cjs.js",
        "./dist/valid-package.esm.js": "./dist/valid-package.browser.esm.js",
      },
      "license": "MIT",
      "main": "dist/valid-package.cjs.js",
      "module": "dist/valid-package.esm.js",
      "name": "valid-package",
      "preconstruct": Object {
        "umdName": "validPackage",
      },
      "private": true,
      "umd:main": "dist/valid-package.umd.min.js",
      "version": "1.0.0",
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
          "main": "dist/something.cjs.js",
          "name": "something",
          "preconstruct": Object {
            "umdName": "somethingUmdName",
          },
          "umd:main": "dist/something.umd.min.js",
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
      "license": "MIT",
      "main": "dist/valid-package.cjs.js",
      "module": "dist/valid-package.esm.js",
      "name": "valid-package",
      "preconstruct": Object {
        "entrypoints": Array [
          "index.js",
          "another.js",
        ],
        "umdName": "validPackage",
      },
      "private": true,
      "umd:main": "dist/valid-package.umd.min.js",
      "version": "1.0.0",
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
      "license": "MIT",
      "main": "dist/valid-package.cjs.js",
      "module": "dist/valid-package.esm.js",
      "name": "valid-package",
      "preconstruct": Object {
        "entrypoints": Array [
          "index.js",
          "another.js",
        ],
        "umdName": "validPackage",
      },
      "private": true,
      "version": "1.0.0",
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
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "main": "dist/pkg-a.cjs.js"
    }

  `);
});

test("no module field with exports field", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      preconstruct: {
        exports: true,
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "src/index.js": "",
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "main": "dist/pkg-a.cjs.js",
      "module": "dist/pkg-a.esm.js",
      "exports": {
        ".": {
          "module": "./dist/pkg-a.esm.js",
          "default": "./dist/pkg-a.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": true,
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("has browser field but no browser condition", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      browser: {
        "./dist/pkg-a.cjs.js": "./dist/pkg-a.browser.cjs.js",
        "./dist/pkg-a.esm.js": "./dist/pkg-a.browser.esm.js",
      },
      preconstruct: {
        exports: true,
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "src/index.js": "",
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "main": "dist/pkg-a.cjs.js",
      "module": "dist/pkg-a.esm.js",
      "browser": {
        "./dist/pkg-a.esm.js": "./dist/pkg-a.browser.esm.js"
      },
      "exports": {
        ".": {
          "module": {
            "browser": "./dist/pkg-a.browser.esm.js",
            "default": "./dist/pkg-a.esm.js"
          },
          "default": "./dist/pkg-a.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": {
          "envConditions": [
            "browser"
          ]
        },
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("has browser condition but no browser field", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      preconstruct: {
        exports: {
          envConditions: ["browser"],
        },
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "src/index.js": "",
  });

  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "main": "dist/pkg-a.cjs.js",
      "module": "dist/pkg-a.esm.js",
      "browser": {
        "./dist/pkg-a.esm.js": "./dist/pkg-a.browser.esm.js"
      },
      "exports": {
        ".": {
          "module": {
            "browser": "./dist/pkg-a.browser.esm.js",
            "default": "./dist/pkg-a.esm.js"
          },
          "default": "./dist/pkg-a.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": {
          "envConditions": [
            "browser"
          ]
        },
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("preconstruct.exports: true no exports field", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.cjs.js",
      module: "dist/pkg-a.esm.js",
      preconstruct: {
        exports: true,
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          exports: true,
        },
      },
    }),
    "src/index.js": "",
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "main": "dist/pkg-a.cjs.js",
      "module": "dist/pkg-a.esm.js",
      "exports": {
        ".": {
          "module": "./dist/pkg-a.esm.js",
          "default": "./dist/pkg-a.cjs.js"
        },
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": true,
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }

  `);
});

test("project level exports field config", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify(
      {
        name: "repo",
        preconstruct: {
          packages: ["packages/*"],
          exports: true,
          ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
            exports: true,
          },
        },
      },
      null,
      2
    ),
    "packages/pkg-a/package.json": JSON.stringify({
      name: "pkg-a",
    }),
    "packages/pkg-a/src/index.js": "",
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "repo",
      "preconstruct": {
        "packages": [
          "packages/*"
        ],
        "exports": true,
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "exports": true
        }
      }
    }
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "main": "dist/pkg-a.cjs.js",
      "module": "dist/pkg-a.esm.js",
      "exports": {
        ".": {
          "module": "./dist/pkg-a.esm.js",
          "default": "./dist/pkg-a.cjs.js"
        },
        "./package.json": "./package.json"
      }
    }

  `);
});

test("fix incorrect main field for module type", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      type: "module",
      main: "dist/pkg-a.cjs.js",
    }),
    "src/index.js": "",
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "type": "module",
      "main": "dist/pkg-a.esm.js"
    }

  `);
});

test("remove module field when module type", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      type: "module",
      main: "dist/pkg-a.esm.js",
      module: "dist/pkg-a.esm.js",
    }),
    "src/index.js": "",
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "type": "module",
      "main": "dist/pkg-a.esm.js"
    }

  `);
});

test("fix incorrect main field for commonjs type", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "pkg-a",
      main: "dist/pkg-a.esm.js",
    }),
    "src/index.js": "",
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "main": "dist/pkg-a.cjs.js"
    }

  `);
});

test("module type with three entrypoints (no main, add main and module)", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "something",
      type: "module",
      preconstruct: {
        entrypoints: ["index.js", "one.js", "two.js"],
      },
    }),
    "src/index.js": "",
    "src/one.js": "",
    "src/two.js": "",
    "one/package.json": JSON.stringify({}),
    "two/package.json": JSON.stringify({}),
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ one/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-one.esm.js"
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "something",
      "type": "module",
      "preconstruct": {
        "entrypoints": [
          "index.js",
          "one.js",
          "two.js"
        ]
      },
      "main": "dist/something.esm.js"
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ two/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "main": "dist/something-two.esm.js"
    }

  `);
});
