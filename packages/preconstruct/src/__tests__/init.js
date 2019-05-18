// @flow
import fixturez from "fixturez";
import path from "path";
import init from "../init";
import { confirms, errors } from "../messages";
import {
  logMock,
  modifyPkg,
  getPkg,
  createPackageCheckTestCreator
} from "../../test-utils";

const f = fixturez(__dirname);

jest.mock("../prompt");

let testInit = createPackageCheckTestCreator(init);

afterEach(() => {
  jest.resetAllMocks();
});

test("no entrypoint", async () => {
  let tmpPath = f.copy("no-entrypoint");
  try {
    await init(tmpPath);
  } catch (error) {
    expect(error.message).toBe(errors.noSource("src/index"));
  }
});

test("do not allow write", async () => {
  let tmpPath = f.copy("basic-package");

  confirms.writeMainField.mockReturnValue(true);

  try {
    await init(tmpPath);
  } catch (error) {
    expect(error.message).toBe(errors.deniedWriteMainField);
  }
  expect(confirms.writeMainField).toBeCalledTimes(1);
});

test("set only main field", async () => {
  let tmpPath = f.copy("basic-package");

  confirms.writeMainField.mockReturnValue(true);
  confirms.writeModuleField.mockReturnValue(false);
  confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

  await init(tmpPath);
  expect(confirms.writeMainField).toBeCalledTimes(1);
  expect(confirms.writeModuleField).toBeCalledTimes(1);
  expect(confirms.addPreconstructDevToPostinstall).toBeCalledTimes(1);

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

  confirms.writeMainField.mockReturnValue(true);
  confirms.writeModuleField.mockReturnValue(true);
  confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

  await init(tmpPath);
  expect(confirms.writeMainField).toBeCalledTimes(1);
  expect(confirms.writeModuleField).toBeCalledTimes(1);
  expect(confirms.addPreconstructDevToPostinstall).toBeCalledTimes(1);

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

  confirms.writeMainField.mockReturnValue(true);
  confirms.writeModuleField.mockReturnValue(true);
  confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

  await init(tmpPath);
  expect(confirms.writeMainField).toBeCalledTimes(1);
  expect(confirms.writeModuleField).toBeCalledTimes(1);
  expect(confirms.addPreconstructDevToPostinstall).toBeCalledTimes(1);
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

  confirms.writeMainField.mockReturnValue(true);
  confirms.writeModuleField.mockReturnValue(true);
  confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

  await init(tmpPath);
  expect(confirms.writeMainField).toBeCalledTimes(2);
  expect(confirms.writeModuleField).toBeCalledTimes(2);
  expect(confirms.addPreconstructDevToPostinstall).toBeCalledTimes(1);

  let pkg1 = await getPkg(path.join(tmpPath, "packages", "package-one"));
  let pkg2 = await getPkg(path.join(tmpPath, "packages", "package-two"));

  expect(Object.keys(pkg1)).toMatchInlineSnapshot(`
Array [
  "name",
  "version",
  "main",
  "module",
  "license",
  "private",
]
`);

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
    "initialised project!",
  ],
]
`);
});

test("typescript", async () => {
  let tmpPath = f.copy("typescript");

  confirms.writeTypesField.mockReturnValue(true);
  confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

  await init(tmpPath);

  expect(confirms.writeTypesField).toBeCalledTimes(1);
  expect(confirms.addPreconstructDevToPostinstall).toBeCalledTimes(1);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
Object {
  "dependencies": Object {
    "@babel/core": "^7.4.3",
    "@babel/preset-typescript": "^7.3.3",
  },
  "license": "MIT",
  "main": "dist/typescript.cjs.js",
  "module": "dist/typescript.esm.js",
  "name": "typescript",
  "private": true,
  "types": "dist/typescript.types",
  "version": "1.0.0",
}
`);
});

test("invalid fields", async () => {
  let tmpPath = f.copy("invalid-fields");

  confirms.writeMainField.mockReturnValue(true);
  confirms.writeModuleField.mockReturnValue(true);
  confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

  await init(tmpPath);

  expect(confirms.writeMainField).toBeCalledTimes(1);
  expect(confirms.writeModuleField).toBeCalledTimes(1);
  expect(confirms.addPreconstructDevToPostinstall).toBeCalledTimes(1);

  let pkg = await getPkg(tmpPath);

  expect(pkg).toMatchInlineSnapshot(`
Object {
  "license": "MIT",
  "main": "dist/invalid-fields.cjs.js",
  "module": "dist/invalid-fields.esm.js",
  "name": "invalid-fields",
  "private": true,
  "react-native": "dist/index.native.js",
  "version": "1.0.0",
}
`);
});

test("fix browser", async () => {
  let tmpPath = f.copy("valid-package");

  confirms.fixBrowserField.mockReturnValue(true);

  await modifyPkg(tmpPath, pkg => {
    pkg.browser = "invalid.js";
  });

  await init(tmpPath);

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

let basicThreeEntrypoints = {
  "": {
    name: "something",
    preconstruct: {
      entrypoints: [".", "two", "three"]
    }
  },
  one: {
    preconstruct: {
      source: "../src"
    }
  },
  two: {
    preconstruct: {
      source: "../src"
    }
  }
};

let basicSingleEntrypoint = {
  "": {
    name: "something"
  }
};

testInit(
  "three entrypoints, no main, only add main",
  basicThreeEntrypoints,
  async run => {
    confirms.writeMainField.mockReturnValue(true);
    confirms.writeModuleField.mockReturnValue(false);
    confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

    let result = await run();

    expect(result).toMatchInlineSnapshot(`
Object {
  "": Object {
    "main": "dist/something.cjs.js",
    "name": "something",
    "preconstruct": Object {
      "entrypoints": Array [
        ".",
        "two",
        "three",
      ],
    },
  },
  "one": Object {
    "preconstruct": Object {
      "source": "../src",
    },
  },
  "two": Object {
    "main": "dist/something.cjs.js",
    "preconstruct": Object {
      "source": "../src",
    },
  },
}
`);
  }
);

testInit(
  "three entrypoints, no main, add main and module",
  basicThreeEntrypoints,
  async run => {
    confirms.writeMainField.mockReturnValue(true);
    confirms.writeModuleField.mockReturnValue(true);
    confirms.addPreconstructDevToPostinstall.mockReturnValue(false);

    let result = await run();

    expect(result).toMatchInlineSnapshot(`
Object {
  "": Object {
    "main": "dist/something.cjs.js",
    "module": "dist/something.esm.js",
    "name": "something",
    "preconstruct": Object {
      "entrypoints": Array [
        ".",
        "two",
        "three",
      ],
    },
  },
  "one": Object {
    "preconstruct": Object {
      "source": "../src",
    },
  },
  "two": Object {
    "main": "dist/something.cjs.js",
    "module": "dist/something.esm.js",
    "preconstruct": Object {
      "source": "../src",
    },
  },
}
`);
  }
);

testInit(
  "three entrypoints, no main, add main and fix browser",
  {
    ...basicThreeEntrypoints,
    "": { ...basicThreeEntrypoints[""], browser: "" }
  },
  async run => {
    confirms.writeMainField.mockReturnValue(true);
    confirms.writeModuleField.mockReturnValue(false);
    confirms.addPreconstructDevToPostinstall.mockReturnValue(false);
    confirms.fixBrowserField.mockReturnValue(true);

    let result = await run();

    expect(result).toMatchInlineSnapshot(`
Object {
  "": Object {
    "browser": Object {
      "./dist/something.cjs.js": "./dist/something.browser.cjs.js",
    },
    "main": "dist/something.cjs.js",
    "name": "something",
    "preconstruct": Object {
      "entrypoints": Array [
        ".",
        "two",
        "three",
      ],
    },
  },
  "one": Object {
    "preconstruct": Object {
      "source": "../src",
    },
  },
  "two": Object {
    "browser": Object {
      "./dist/something.cjs.js": "./dist/something.browser.cjs.js",
    },
    "main": "dist/something.cjs.js",
    "preconstruct": Object {
      "source": "../src",
    },
  },
}
`);
  }
);

testInit("add preconstruct dev", basicSingleEntrypoint, async run => {
  confirms.writeMainField.mockReturnValue(true);
  confirms.writeModuleField.mockReturnValue(false);
  confirms.addPreconstructDevToPostinstall.mockReturnValue(true);

  let result = await run();

  expect(confirms.addPreconstructDevToPostinstall).toBeCalledTimes(1);

  expect(result).toMatchInlineSnapshot(`
Object {
  "": Object {
    "main": "dist/something.cjs.js",
    "name": "something",
    "scripts": Object {
      "postinstall": "preconstruct dev",
    },
  },
}
`);
});

testInit(
  "fix umd",
  {
    "": {
      name: "something",
      "umd:main": "something"
    }
  },
  async run => {
    confirms.writeMainField.mockReturnValue(true);
    confirms.writeModuleField.mockReturnValue(false);
    confirms.fixUmdBuild.mockReturnValue(true);
    confirms.addPreconstructDevToPostinstall.mockReturnValue(true);

    let result = await run();

    expect(result).toMatchInlineSnapshot(`
Object {
  "": Object {
    "main": "dist/something.cjs.js",
    "name": "something",
    "scripts": Object {
      "postinstall": "preconstruct dev",
    },
    "umd:main": "dist/something.umd.min.js",
  },
}
`);
  }
);
