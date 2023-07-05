import spawn from "spawndamnit";
import build from "..";
import {
  typescriptFixture,
  testdir,
  getFiles,
  ts,
  js,
} from "../../../test-utils";

// TODO: make it faster so this isn't required
jest.setTimeout(20000);

test("imports conditions", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/pkg",
      main: "dist/scope-pkg.cjs.js",
      module: "dist/scope-pkg.esm.js",
      exports: {
        ".": {
          types: {
            import: "./dist/scope-pkg.cjs.mjs",
            default: "./dist/scope-pkg.cjs.js",
          },
          development: {
            worker: {
              module: "./dist/scope-pkg.development.esm.js",
              import: "./dist/scope-pkg.development.cjs.mjs",
              default: "./dist/scope-pkg.development.cjs.js",
            },
            browser: {
              module: "./dist/scope-pkg.browser.development.esm.js",
              import: "./dist/scope-pkg.browser.development.cjs.mjs",
              default: "./dist/scope-pkg.browser.development.cjs.js",
            },
            module: "./dist/scope-pkg.development.esm.js",
            import: "./dist/scope-pkg.development.cjs.mjs",
            default: "./dist/scope-pkg.development.cjs.js",
          },
          worker: {
            module: "./dist/scope-pkg.esm.js",
            import: "./dist/scope-pkg.cjs.mjs",
            default: "./dist/scope-pkg.cjs.js",
          },
          browser: {
            module: "./dist/scope-pkg.browser.esm.js",
            import: "./dist/scope-pkg.browser.cjs.mjs",
            default: "./dist/scope-pkg.browser.cjs.js",
          },
          module: "./dist/scope-pkg.esm.js",
          import: "./dist/scope-pkg.cjs.mjs",
          default: "./dist/scope-pkg.cjs.js",
        },
        "./package.json": "./package.json",
      },
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
          development: "./src/true.ts",
          default: "./src/false.ts",
        },
        "#is-browser": {
          worker: "./src/false.ts",
          browser: "./src/true.ts",
          default: "./src/false.ts",
        },
        "#something": {
          "condition-should-never-appear-anywhere": "./src/something.ts",
          default: "./src/something.ts",
        },
      },
    }),
    "src/true.ts": ts`
      export default true;
    `,
    "src/false.ts": ts`
      export default false;
    `,
    "src/something.ts": ts`
      export function something() {
        console.log("a");
      }
    `,
    "src/index.ts": ts`
      import isDevelopment from "#is-development";
      import isBrowser from "#is-browser";
      export { something } from "#something";
      if (isDevelopment) {
        console.log("development");
      }
      if (isBrowser) {
        console.log("browser");
      }
    `,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        declaration: true,
      },
    }),
    node_modules: typescriptFixture.node_modules,
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export { something } from "./something.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/something.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare function something(): void;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function something() {
      console.log("a");
    }

    {
      console.log("browser");
    }

    exports.something = something;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      something
    } from "./scope-pkg.browser.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.development.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function something() {
      console.log("a");
    }

    {
      console.log("development");
    }
    {
      console.log("browser");
    }

    exports.something = something;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.development.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      something
    } from "./scope-pkg.browser.development.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.development.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    function something() {
      console.log("a");
    }

    {
      console.log("development");
    }
    {
      console.log("browser");
    }

    export { something };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.browser.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    function something() {
      console.log("a");
    }

    {
      console.log("browser");
    }

    export { something };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=scope-pkg.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"scope-pkg.cjs.d.mts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-pkg.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"scope-pkg.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function something() {
      console.log("a");
    }

    exports.something = something;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      something
    } from "./scope-pkg.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.development.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function something() {
      console.log("a");
    }

    {
      console.log("development");
    }

    exports.something = something;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.development.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export {
      something
    } from "./scope-pkg.development.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.development.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    function something() {
      console.log("a");
    }

    {
      console.log("development");
    }

    export { something };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    function something() {
      console.log("a");
    }

    export { something };

  `);
});

describe("imports conditions runtime check with importConditionDefaultExport: default", () => {
  // we should be able to just type this as string and assign to it from within `beforeAll`
  // but Jest doesn't wait on `beforeAll`'s completion before executing concurrent tests
  // see https://github.com/jestjs/jest/issues/7997
  let dirPromise: Promise<string>;

  beforeAll(async () => {
    let resolve: (dir: string) => void;
    dirPromise = new Promise((_resolve) => (resolve = _resolve));

    const dir = await testdir({
      "package.json": JSON.stringify({
        name: "@scope/pkg",
        main: "dist/scope-pkg.cjs.js",
        module: "dist/scope-pkg.esm.js",
        exports: {
          ".": {
            types: {
              import: "./dist/scope-pkg.cjs.mjs",
              default: "./dist/scope-pkg.cjs.js",
            },
            browser: {
              development: {
                module: "./dist/scope-pkg.browser.development.esm.js",
                import: "./dist/scope-pkg.browser.development.cjs.mjs",
                default: "./dist/scope-pkg.browser.development.cjs.js",
              },
              module: "./dist/scope-pkg.browser.esm.js",
              import: "./dist/scope-pkg.browser.cjs.mjs",
              default: "./dist/scope-pkg.browser.cjs.js",
            },
            development: {
              module: "./dist/scope-pkg.development.esm.js",
              import: "./dist/scope-pkg.development.cjs.mjs",
              default: "./dist/scope-pkg.development.cjs.js",
            },
            module: "./dist/scope-pkg.esm.js",
            import: "./dist/scope-pkg.cjs.mjs",
            default: "./dist/scope-pkg.cjs.js",
          },
          "./package.json": "./package.json",
        },
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
            browser: "./src/true.js",
            default: "./src/false.js",
          },
        },
      }),
      "src/true.js": js`
        export default true;
      `,
      "src/false.js": js`
        export default false;
      `,
      "src/index.js": js`
        import isDevelopment from "#is-development";
        import isBrowser from "#is-browser";
        if (isDevelopment) {
          console.log("development");
        } else {
          console.log("production");
        }
        if (isBrowser) {
          console.log("browser");
        } else {
          console.log("node");
        }
      `,
      node_modules: typescriptFixture.node_modules,
      "runtime-check.mjs": js`
        import "@scope/pkg";
      `,
      "runtime-check.cjs": js`
        require("@scope/pkg");
      `,
    });
    await build(dir);

    resolve!(dir);
  });

  describe.each(["cjs", "mjs"] as const)("with %s", (moduleType) => {
    test.each([
      {
        conditions: [],
        expected: ["production", "node"],
      },
      {
        conditions: ["development"],
        expected: ["development", "node"],
      },
      {
        conditions: ["browser"],
        expected: ["production", "browser"],
      },
      {
        conditions: ["development", "browser"],
        expected: ["development", "browser"],
      },
    ])("and conditions: $conditions", async ({ conditions, expected }) => {
      let node = await spawn(
        "node",
        [
          ...conditions.flatMap((condition) => ["-C", condition]),
          `./runtime-check.${moduleType}`,
        ],
        {
          cwd: await dirPromise,
        }
      );

      expect(node.code).toBe(0);
      expect(node.stdout.toString("utf8")).toBe(expected.join("\n") + "\n");
      expect(node.stderr.toString("utf8")).toMatchInlineSnapshot(`""`);
    });
  });
});

test("import with #something inside import type type arguments", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/pkg",
      main: "dist/scope-pkg.cjs.js",
      module: "dist/scope-pkg.esm.js",
      exports: {
        ".": {
          types: {
            import: "./dist/scope-pkg.cjs.mjs",
            default: "./dist/scope-pkg.cjs.js",
          },
          module: "./dist/scope-pkg.esm.js",
          import: "./dist/scope-pkg.cjs.mjs",
          default: "./dist/scope-pkg.cjs.js",
        },
        "./package.json": "./package.json",
      },
      preconstruct: {
        exports: {
          importConditionDefaultExport: "default",
        },
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          importsConditions: true,
        },
      },
      imports: {
        "#*": "./src/*.ts",
      },
    }),
    "src/something.ts": ts`
      export type Generic<T> = { a: T; b?: Generic<T> };
    `,
    "src/other.ts": ts`
      export type A = { a?: A };
    `,
    "src/index.ts": ts`
      export type X = import("#something").Generic<import("#other").A>;
    `,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        declaration: true,
      },
    }),
    node_modules: typescriptFixture.node_modules,
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
  });
  await build(dir);
  expect(await getFiles(dir, ["dist/**"])).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type X = import("./something.js").Generic<import("./other.js").A>;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/other.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type A = {
        a?: A;
    };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/something.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export type Generic<T> = {
        a: T;
        b?: Generic<T>;
    };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.mts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index.js";
    //# sourceMappingURL=scope-pkg.cjs.d.mts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.mts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"scope-pkg.cjs.d.mts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";
    //# sourceMappingURL=scope-pkg.cjs.d.ts.map

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    {"version":3,"file":"scope-pkg.cjs.d.ts","sourceRoot":"","sources":["./declarations/src/index.d.ts"],"names":[],"mappings":"AAAA"}

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';


    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.cjs.mjs ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import "./scope-pkg.cjs.js";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-pkg.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯


  `);
});
