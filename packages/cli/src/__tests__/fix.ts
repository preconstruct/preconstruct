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
  ts,
} from "../../test-utils";
import { promptInput as _promptInput } from "../prompt";
import fs from "node:fs/promises";

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
    {
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
        "exports": true
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
    {
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
    {
      "license": "MIT",
      "main": "dist/something.cjs.js",
      "module": "dist/something.esm.js",
      "name": "@scope/something",
      "preconstruct": {
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
    {
      "license": "MIT",
      "main": "dist/some-scope-package-one.cjs.js",
      "module": "dist/some-scope-package-one.esm.js",
      "name": "@some-scope/package-one",
      "private": true,
      "version": "1.0.0",
    }
  `);

  expect(pkg2).toMatchInlineSnapshot(`
    {
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
    [
      [
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
    {
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
    {
      "browser": {
        "./dist/valid-package.cjs.js": "./dist/valid-package.browser.cjs.js",
        "./dist/valid-package.esm.js": "./dist/valid-package.browser.esm.js",
      },
      "license": "MIT",
      "main": "dist/valid-package.cjs.js",
      "module": "dist/valid-package.esm.js",
      "name": "valid-package",
      "preconstruct": {
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
    [
      [
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
      {
        "": {
          "main": "dist/something.cjs.js",
          "name": "something",
          "preconstruct": {
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
      "main": "dist/valid-package-another.cjs.js",
      "module": "dist/valid-package-another.esm.js",
      "umd:main": "dist/valid-package-another.umd.min.js",
      "preconstruct": {
        "umdName": "another"
      }
    }
    "
  `);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    {
      "license": "MIT",
      "main": "dist/valid-package.cjs.js",
      "module": "dist/valid-package.esm.js",
      "name": "valid-package",
      "preconstruct": {
        "entrypoints": [
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
    {
      "main": "dist/valid-package-another.cjs.js",
      "module": "dist/valid-package-another.esm.js",
    }
  `);

  expect(await getPkg(tmpPath)).toMatchInlineSnapshot(`
    {
      "license": "MIT",
      "main": "dist/valid-package.cjs.js",
      "module": "dist/valid-package.esm.js",
      "name": "valid-package",
      "preconstruct": {
        "entrypoints": [
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
        "exports": true
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
        "exports": true
      }
    }

  `);
});

test("project level exports field config", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify(
      {
        name: "repo",
        preconstruct: { packages: ["packages/*"], exports: true },
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
        "exports": true
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

test("experimental exports flag is removed", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify(
      {
        name: "repo",
        preconstruct: {
          packages: ["packages/*"],
          exports: true,
          ___experimentalFlags_WILL_CHANGE_IN_PATCH: { exports: true },
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
        "exports": true
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

test("import conditions fix", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/pkg",
      preconstruct: {
        exports: true,
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
        },
      },
      imports: {
        "#is-development": {
          development: "./src/true.js",
          default: "./src/false.js",
        },
        "#is-browser": {
          worker: "./src/false.js",
          browser: "./src/true.js",
          default: "./src/false.js",
        },
        "#something": {
          "condition-should-never-appear-anywhere": "./src/true.js",
          default: "./src/true.js",
        },
      },
    }),
    "src/index.ts": ts`
      export {};
    `,
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "@scope/pkg",
      "preconstruct": {
        "exports": true,
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "importsConditions": true
        }
      },
      "imports": {
        "#is-development": {
          "development": "./src/true.js",
          "default": "./src/false.js"
        },
        "#is-browser": {
          "worker": "./src/false.js",
          "browser": "./src/true.js",
          "default": "./src/false.js"
        },
        "#something": {
          "condition-should-never-appear-anywhere": "./src/true.js",
          "default": "./src/true.js"
        }
      },
      "main": "dist/scope-pkg.cjs.js",
      "module": "dist/scope-pkg.esm.js",
      "exports": {
        ".": {
          "types": "./dist/scope-pkg.cjs.js",
          "development": {
            "worker": {
              "module": "./dist/scope-pkg.development.esm.js",
              "default": "./dist/scope-pkg.development.cjs.js"
            },
            "browser": {
              "module": "./dist/scope-pkg.browser.development.esm.js",
              "default": "./dist/scope-pkg.browser.development.cjs.js"
            },
            "module": "./dist/scope-pkg.development.esm.js",
            "default": "./dist/scope-pkg.development.cjs.js"
          },
          "worker": {
            "module": "./dist/scope-pkg.esm.js",
            "default": "./dist/scope-pkg.cjs.js"
          },
          "browser": {
            "module": "./dist/scope-pkg.browser.esm.js",
            "default": "./dist/scope-pkg.browser.cjs.js"
          },
          "module": "./dist/scope-pkg.esm.js",
          "default": "./dist/scope-pkg.cjs.js"
        },
        "./package.json": "./package.json"
      }
    }

  `);
});

test("import conditions fix with importConditionDefaultExport: default", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/pkg",
      preconstruct: {
        exports: {
          importConditionDefaultExport: "default",
        },
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
        },
      },
      imports: {
        "#is-development": {
          development: "./src/true.js",
          default: "./src/false.js",
        },
        "#is-browser": {
          worker: "./src/false.js",
          browser: "./src/true.js",
          default: "./src/false.js",
        },
        "#something": {
          "condition-should-never-appear-anywhere": "./src/true.js",
          default: "./src/true.js",
        },
      },
    }),
    "src/index.ts": ts`
      export {};
    `,
  });
  await fix(tmpPath);
  expect(await getFiles(tmpPath, ["package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "@scope/pkg",
      "preconstruct": {
        "exports": {
          "importConditionDefaultExport": "default"
        },
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "importsConditions": true
        }
      },
      "imports": {
        "#is-development": {
          "development": "./src/true.js",
          "default": "./src/false.js"
        },
        "#is-browser": {
          "worker": "./src/false.js",
          "browser": "./src/true.js",
          "default": "./src/false.js"
        },
        "#something": {
          "condition-should-never-appear-anywhere": "./src/true.js",
          "default": "./src/true.js"
        }
      },
      "main": "dist/scope-pkg.cjs.js",
      "module": "dist/scope-pkg.esm.js",
      "exports": {
        ".": {
          "types": {
            "import": "./dist/scope-pkg.cjs.mjs",
            "default": "./dist/scope-pkg.cjs.js"
          },
          "development": {
            "worker": {
              "module": "./dist/scope-pkg.development.esm.js",
              "import": "./dist/scope-pkg.development.cjs.mjs",
              "default": "./dist/scope-pkg.development.cjs.js"
            },
            "browser": {
              "module": "./dist/scope-pkg.browser.development.esm.js",
              "import": "./dist/scope-pkg.browser.development.cjs.mjs",
              "default": "./dist/scope-pkg.browser.development.cjs.js"
            },
            "module": "./dist/scope-pkg.development.esm.js",
            "import": "./dist/scope-pkg.development.cjs.mjs",
            "default": "./dist/scope-pkg.development.cjs.js"
          },
          "worker": {
            "module": "./dist/scope-pkg.esm.js",
            "import": "./dist/scope-pkg.cjs.mjs",
            "default": "./dist/scope-pkg.cjs.js"
          },
          "browser": {
            "module": "./dist/scope-pkg.browser.esm.js",
            "import": "./dist/scope-pkg.browser.cjs.mjs",
            "default": "./dist/scope-pkg.browser.cjs.js"
          },
          "module": "./dist/scope-pkg.esm.js",
          "import": "./dist/scope-pkg.cjs.mjs",
          "default": "./dist/scope-pkg.cjs.js"
        },
        "./package.json": "./package.json"
      }
    }

  `);
});

test("nothing is written when another package's fixing throws an error", async () => {
  const tmpPath = await testdir({
    "package.json": JSON.stringify(
      {
        name: "repo",
        preconstruct: {
          packages: ["packages/*"],
          exports: {
            importConditionDefaultExport: "default",
          },
          ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
            importsConditions: true,
          },
        },
      },
      null,
      2
    ),
    "packages/pkg-a/package.json": JSON.stringify(
      {
        name: "pkg-a",
        preconstruct: { exports: { envConditions: ["browser"] } },
      },
      null,
      2
    ),
    "packages/pkg-a/src/index.js": ``,
    "packages/pkg-b/package.json": JSON.stringify({ name: "pkg-b" }, null, 2),
    "packages/pkg-b/src/index.js": ``,
  });
  await expect(fix(tmpPath)).rejects.toMatchInlineSnapshot(
    `[Error: the "preconstruct.exports.envConditions" field is not supported when the imports conditions feature is enabled]`
  );
  expect(await getFiles(tmpPath, ["packages/*/package.json"]))
    .toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-a/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-a",
      "preconstruct": {
        "exports": {
          "envConditions": [
            "browser"
          ]
        }
      }
    }
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ packages/pkg-b/package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "pkg-b"
    }
  `);
});

test("type: module removes package.json", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "multiple-entrypoints",
      type: "module",
      exports: {
        ".": "./dist/multiple-entrypoints.js",
        "./multiply": "./dist/multiple-entrypoints-multiply.js",
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: true,
        entrypoints: ["index.ts", "multiply.ts"],
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
          distInRoot: true,
          typeModule: true,
        },
      },
    }),
    "multiply/package.json": JSON.stringify({
      name: "multiple-entrypoints/multiply",
      main: "dist/multiple-entrypoints-multiply.cjs.js",
      module: "dist/multiple-entrypoints-multiply.esm.js",
    }),
    "src/index.ts": js`
      export let a = "a";
    `,
    "src/multiply.ts": js`
      export let b = "b";
    `,
    "runtime-blah.mjs": js`
      import { b } from "multiple-entrypoints/multiply";
      console.log(b);
    `,
  });

  await fix(dir);

  expect(await getFiles(dir, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"name":"multiple-entrypoints","type":"module","exports":{".":"./dist/multiple-entrypoints.js","./multiply":"./dist/multiple-entrypoints-multiply.js","./package.json":"./package.json"},"preconstruct":{"exports":true,"entrypoints":["index.ts","multiply.ts"],"___experimentalFlags_WILL_CHANGE_IN_PATCH":{"importsConditions":true,"distInRoot":true,"typeModule":true}}}
  `);
});

test("type: module removes main/module/browser/umd:main fields in package.json", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify(
      {
        name: "multiple-entrypoints",
        type: "module",
        main: "dist/multiple-entrypoints.cjs.js",
        module: "dist/multiple-entrypoints.esm.js",
        browser: "dist/multiple-entrypoints.browser.js",
        "umd:main": "dist/multiple-entrypoints.umd.js",
        exports: {
          ".": "./dist/multiple-entrypoints.js",
          "./multiply": "./dist/multiple-entrypoints-multiply.js",
          "./package.json": "./package.json",
        },
        preconstruct: {
          exports: true,
          entrypoints: ["index.ts", "multiply.ts"],
          ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
            importsConditions: true,
            distInRoot: true,
            typeModule: true,
          },
        },
      },
      null,
      2
    ),
    "multiply/package.json": JSON.stringify({
      name: "multiple-entrypoints/multiply",
      main: "dist/multiple-entrypoints-multiply.cjs.js",
      module: "dist/multiple-entrypoints-multiply.esm.js",
    }),
    "src/index.ts": js`
      export let a = "a";
    `,
    "src/multiply.ts": js`
      export let b = "b";
    `,
    "runtime-blah.mjs": js`
      import { b } from "multiple-entrypoints/multiply";
      console.log(b);
    `,
  });

  await fix(dir);

  expect(await getFiles(dir, ["**/package.json"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ package.json ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {
      "name": "multiple-entrypoints",
      "type": "module",
      "exports": {
        ".": "./dist/multiple-entrypoints.js",
        "./multiply": "./dist/multiple-entrypoints-multiply.js",
        "./package.json": "./package.json"
      },
      "preconstruct": {
        "exports": true,
        "entrypoints": [
          "index.ts",
          "multiply.ts"
        ],
        "___experimentalFlags_WILL_CHANGE_IN_PATCH": {
          "importsConditions": true,
          "distInRoot": true,
          "typeModule": true
        }
      }
    }

  `);
});
