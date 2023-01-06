import path from "path";
import build from "../";
import fixturez from "fixturez";
import {
  snapshotDistFiles,
  snapshotDirectory,
  testdir,
  getDist,
  tsx,
  ts,
  repoNodeModules,
  js,
} from "../../../test-utils";
import { BatchError } from "../../errors";
import stripAnsi from "strip-ansi";

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
  let tmpPath = await testdir({
    "package.json": JSON.stringify({
      name: "weird-typescript-thing",
      main: "dist/weird-typescript-thing.cjs.js",
      module: "dist/weird-typescript-thing.esm.js",

      dependencies: {
        "@babel/runtime": "^7.8.7",
      },

      devDependencies: {
        typescript: "^3.8.3",
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "esnext",
          module: "esnext",
          jsx: "react",
          isolatedModules: true,
          strict: true,
          moduleResolution: "node",
          esModuleInterop: true,
          noEmit: true,
        },
      },
      null,
      2
    ),
    "src/index.ts": ts`
                      import { makeThing } from "./thing";

                      export const thing = makeThing();
                    `,

    "src/other.ts": ts`
                      export const thing = () => "wow" as const;
                    `,

    "src/thing.tsx": tsx`
                       import { thing } from "./other";

                       export const makeThing = () => thing();
                     `,

    "dist/declarations/src/index.d.ts": ts`
                                          export declare const thing: "wow";
                                        `,

    "dist/declarations/src/other.d.ts": ts`
                                          export declare const thing: () => "wow";
                                        `,

    "dist/declarations/src/thing.d.ts": ts`
                                          export declare const makeThing: () => "wow";
                                        `,
  });
  await build(tmpPath);

  await snapshotDirectory(path.join(tmpPath, "dist"), { files: "all" });
});

test("typescript declarationMap", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "typescript-declarationMap",
      main: "dist/typescript-declarationMap.cjs.js",
      module: "dist/typescript-declarationMap.esm.js",

      dependencies: {
        "@babel/runtime": "^7.8.7",
      },

      devDependencies: {
        typescript: "^3.8.3",
      },
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "esnext",
          module: "esnext",
          declarationMap: true,
          jsx: "react",
          isolatedModules: true,
          strict: true,
          moduleResolution: "node",
          esModuleInterop: true,
          noEmit: true,
        },
      },
      null,
      2
    ),
    "src/index.ts": ts`
                      export const thing = "wow" as const;
                    `,
  });

  await build(dir);
  await expect(getDist(dir)).resolves.toMatchInlineSnapshot(`
          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          export declare const thing: "wow";
          //# sourceMappingURL=index.d.ts.map
          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          {"version":3,"file":"index.d.ts","sourceRoot":"../../../src","sources":["index.ts"],"names":[],"mappings":"AAAA,eAAO,MAAM,KAAK,OAAiB,CAAC"}
          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript-declarationMap.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          export * from "./declarations/src/index";

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript-declarationMap.cjs.dev.js, dist/typescript-declarationMap.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          Object.defineProperty(exports, '__esModule', { value: true });

          const thing = "wow";

          exports.thing = thing;

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript-declarationMap.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          if (process.env.NODE_ENV === "production") {
            module.exports = require("./typescript-declarationMap.cjs.prod.js");
          } else {
            module.exports = require("./typescript-declarationMap.cjs.dev.js");
          }

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/typescript-declarationMap.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          const thing = "wow";

          export { thing };

        `);
});

test("process.env.NODE_ENV reassignment", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
    }),
    "src/index.js": js`
                      process.env.NODE_ENV = "development";
                      something12.process.env.NODE_ENV = "development";
                      console.log(process.env.NODE_ENV);
                      console.log(something.process.env.NODE_ENV);
                    `,
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    process.env.NODE_ENV = "development";
    something12.process.env.NODE_ENV = "development";
    console.log(process.env.NODE_ENV);
    console.log(something.process.env.NODE_ENV);

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    process.env.NODE_ENV = "development";
    something12.process.env.NODE_ENV = "development";
    console.log(        "production");
    console.log(something.process.env.NODE_ENV);

  `);
});

test("process.env.NODE_ENV reassignment new approach", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
    }),
    "src/index.js": js`
                      process.env.NODE_ENV = "development";
                      something12.process.env.NODE_ENV = "development";
                      console.log(process.env.NODE_ENV);
                      console.log(something.process.env.NODE_ENV);
                    `,
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    process.env.NODE_ENV = "development";
    something12.process.env.NODE_ENV = "development";
    console.log(process.env.NODE_ENV);
    console.log(something.process.env.NODE_ENV);

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    process.env.NODE_ENV = "development";
    something12.process.env.NODE_ENV = "development";
    console.log(        "production");
    console.log(something.process.env.NODE_ENV);

  `);
});

test("does not duplicate babel helpers", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
    }),
    "src/index.js": "export {Other} from './other'; export class Thing {}",
    "src/other.js": "export class Other {}",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    var Other = function Other() {
      _classCallCheck(this, Other);
    };

    var Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    exports.Other = Other;
    exports.Thing = Thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

  `);
});

test("imports helpers from @babel/runtime without @babel/plugin-transform-runtime", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      module: "dist/test.esm.js",
      dependencies: {
        "@babel/runtime": "7",
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
    }),
    "src/index.js": "export {Other} from './other'; export class Thing {}",
    "src/other.js": "export class Other {}",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var _classCallCheck = require('@babel/runtime/helpers/classCallCheck');

    var Other = function Other() {
      _classCallCheck(this, Other);
    };

    var Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    exports.Other = Other;
    exports.Thing = Thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import _classCallCheck from '@babel/runtime/helpers/esm/classCallCheck';

    var Other = function Other() {
      _classCallCheck(this, Other);
    };

    var Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    export { Other, Thing };

  `);
});

test("imports helpers from @babel/runtime-corejs2 without @babel/plugin-transform-runtime", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      module: "dist/test.esm.js",
      dependencies: {
        "@babel/runtime-corejs2": "7",
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
    }),
    "src/index.js": "export {Other} from './other'; export class Thing {}",
    "src/other.js": "export class Other {}",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var _classCallCheck = require('@babel/runtime-corejs2/helpers/classCallCheck');

    var Other = function Other() {
      _classCallCheck(this, Other);
    };

    var Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    exports.Other = Other;
    exports.Thing = Thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import _classCallCheck from '@babel/runtime-corejs2/helpers/esm/classCallCheck';

    var Other = function Other() {
      _classCallCheck(this, Other);
    };

    var Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    export { Other, Thing };

  `);
});

test("imports helpers from @babel/runtime-corejs3 without @babel/plugin-transform-runtime", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      module: "dist/test.esm.js",
      dependencies: {
        "@babel/runtime-corejs3": "7",
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
    }),
    "src/index.js": "export {Other} from './other'; export class Thing {}",
    "src/other.js": "export class Other {}",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var _classCallCheck = require('@babel/runtime-corejs3/helpers/classCallCheck');

    var Other = function Other() {
      _classCallCheck(this, Other);
    };

    var Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    exports.Other = Other;
    exports.Thing = Thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import _classCallCheck from '@babel/runtime-corejs3/helpers/esm/classCallCheck';

    var Other = function Other() {
      _classCallCheck(this, Other);
    };

    var Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    export { Other, Thing };

  `);
});

test("does not duplicate babel helpers when using @babel/plugin-transform-runtime but the helper isn't in the version of @babel/runtime that the user has specified", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      dependencies: {
        "@babel/runtime": "*",
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
      plugins: [require.resolve("@babel/plugin-transform-runtime")],
    }),
    "src/index.js": "import './other'; for (const x of something) {}",
    "src/other.js": "for (const x of something) {}",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

      return arr2;
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(n);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }

    function _createForOfIteratorHelper(o) {
      if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
        if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) {
          var i = 0;

          var F = function () {};

          return {
            s: F,
            n: function () {
              if (i >= o.length) return {
                done: true
              };
              return {
                done: false,
                value: o[i++]
              };
            },
            e: function (e) {
              throw e;
            },
            f: F
          };
        }

        throw new TypeError("Invalid attempt to iterate non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }

      var it,
          normalCompletion = true,
          didErr = false,
          err;
      return {
        s: function () {
          it = o[Symbol.iterator]();
        },
        n: function () {
          var step = it.next();
          normalCompletion = step.done;
          return step;
        },
        e: function (e) {
          didErr = true;
          err = e;
        },
        f: function () {
          try {
            if (!normalCompletion && it.return != null) it.return();
          } finally {
            if (didErr) throw err;
          }
        }
      };
    }

    var _iterator = _createForOfIteratorHelper(something),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var x = _step.value;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var _iterator$1 = _createForOfIteratorHelper(something),
        _step$1;

    try {
      for (_iterator$1.s(); !(_step$1 = _iterator$1.n()).done;) {
        var x$1 = _step$1.value;
      }
    } catch (err) {
      _iterator$1.e(err);
    } finally {
      _iterator$1.f();
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

  `);
});

test("does not duplicate babel helpers when not using @babel/plugin-transform-runtime and the helper isn't in the version of @babel/runtime that the user has specified", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      dependencies: {
        "@babel/runtime": "*",
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
    }),
    "src/index.js": "import './other'; for (const x of something) {}",
    "src/other.js": "for (const x of something) {}",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

      return arr2;
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(n);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }

    function _createForOfIteratorHelper(o) {
      if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
        if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) {
          var i = 0;

          var F = function () {};

          return {
            s: F,
            n: function () {
              if (i >= o.length) return {
                done: true
              };
              return {
                done: false,
                value: o[i++]
              };
            },
            e: function (e) {
              throw e;
            },
            f: F
          };
        }

        throw new TypeError("Invalid attempt to iterate non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }

      var it,
          normalCompletion = true,
          didErr = false,
          err;
      return {
        s: function () {
          it = o[Symbol.iterator]();
        },
        n: function () {
          var step = it.next();
          normalCompletion = step.done;
          return step;
        },
        e: function (e) {
          didErr = true;
          err = e;
        },
        f: function () {
          try {
            if (!normalCompletion && it.return != null) it.return();
          } finally {
            if (didErr) throw err;
          }
        }
      };
    }

    var _iterator = _createForOfIteratorHelper(something),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var x = _step.value;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var _iterator$1 = _createForOfIteratorHelper(something),
        _step$1;

    try {
      for (_iterator$1.s(); !(_step$1 = _iterator$1.n()).done;) {
        var x$1 = _step$1.value;
      }
    } catch (err) {
      _iterator$1.e(err);
    } finally {
      _iterator$1.f();
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

  `);
});

test("imports helpers for a helper only available in a newer version of @babel/runtime (without @babel/plugin-transfrom-runtime)", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      dependencies: {
        "@babel/runtime": "7.9",
      },
    }),
    "babel.config.json": JSON.stringify({
      presets: [require.resolve("@babel/preset-env")],
    }),
    "src/index.js": "import './other'; for (const x of something) {}",
    "src/other.js": "for (const x of something) {}",
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.dev.js, dist/test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    var _createForOfIteratorHelper = require('@babel/runtime/helpers/createForOfIteratorHelper');

    var _iterator = _createForOfIteratorHelper(something),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var x = _step.value;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var _iterator$1 = _createForOfIteratorHelper(something),
        _step$1;

    try {
      for (_iterator$1.s(); !(_step$1 = _iterator$1.n()).done;) {
        var x$1 = _step$1.value;
      }
    } catch (err) {
      _iterator$1.e(err);
    } finally {
      _iterator$1.f();
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

  `);
});

test("new dist filenames", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
      module: "dist/scope-test.esm.js",
    }),
    "src/index.js": js`
                      export default "something";
                    `,
  });
  await build(dir);
  await expect(getDist(dir)).resolves.toMatchInlineSnapshot(`
          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.dev.js, dist/scope-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          Object.defineProperty(exports, '__esModule', { value: true });

          var index = "something";

          exports.default = index;

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          if (process.env.NODE_ENV === "production") {
            module.exports = require("./scope-test.cjs.prod.js");
          } else {
            module.exports = require("./scope-test.cjs.dev.js");
          }

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          var index = "something";

          export default index;

        `);
});

test("UMD with dep that uses process.env.NODE_ENV", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
      "umd:main": "dist/scope-test.umd.min.js",
      dependencies: {
        somewhere: "*",
      },
      preconstruct: { umdName: "test" },
    }),
    "src/index.js": js`
                      import { x } from "somewhere";
                      console.log(x);
                      export default "something";
                    `,
    "node_modules/somewhere/index.js": js`
                                         export let x = process.env.NODE_ENV;
                                       `,

    "node_modules/somewhere/package.json": JSON.stringify({
      name: "somewhere",
    }),
  });
  await build(dir);
  await expect(getDist(dir)).resolves.toMatchInlineSnapshot(`
          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.dev.js, dist/scope-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          Object.defineProperty(exports, '__esModule', { value: true });

          var somewhere = require('somewhere');

          console.log(somewhere.x);
          var index = "something";

          exports.default = index;

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          if (process.env.NODE_ENV === "production") {
            module.exports = require("./scope-test.cjs.prod.js");
          } else {
            module.exports = require("./scope-test.cjs.dev.js");
          }

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.umd.min.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          !function(e,o){"object"==typeof exports&&"undefined"!=typeof module?module.exports=o():"function"==typeof define&&define.amd?define(o):(e="undefined"!=typeof globalThis?globalThis:e||self).test=o()}(this,(function(){"use strict";console.log("production");return"something"}));
          //# sourceMappingURL=scope-test.umd.min.js.map

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.umd.min.js.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          {"version":3,"file":"scope-test.umd.min.js","sources":["../src/index.js"],"sourcesContent":["import { x } from \\"somewhere\\";\\nconsole.log(x);\\nexport default \\"something\\";"],"names":["console","log"],"mappings":"qOACAA,QAAQC,wBACO"}
        `);
});

test("UMD build with process.env.NODE_ENV and typeof document", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
      "umd:main": "dist/scope-test.umd.min.js",
      preconstruct: {
        umdName: "x",
      },
    }),
    "src/index.js": js`
                      let x = typeof document;

                      const thing = () => {
                        console.log(process.env.NODE_ENV);
                      };

                      export default thing;
                    `,
  });
  await build(dir);
  await expect(getDist(dir)).resolves.toMatchInlineSnapshot(`
          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.dev.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          Object.defineProperty(exports, '__esModule', { value: true });

          const thing = () => {
            console.log(process.env.NODE_ENV);
          };

          exports.default = thing;

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          if (process.env.NODE_ENV === "production") {
            module.exports = require("./scope-test.cjs.prod.js");
          } else {
            module.exports = require("./scope-test.cjs.dev.js");
          }

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          'use strict';

          Object.defineProperty(exports, '__esModule', { value: true });

          const thing = () => {
            console.log(        "production");
          };

          exports.default = thing;

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.umd.min.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          !function(e,o){"object"==typeof exports&&"undefined"!=typeof module?module.exports=o():"function"==typeof define&&define.amd?define(o):(e="undefined"!=typeof globalThis?globalThis:e||self).x=o()}(this,(function(){"use strict";return()=>{console.log("production")}}));
          //# sourceMappingURL=scope-test.umd.min.js.map

          ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.umd.min.js.map ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
          {"version":3,"file":"scope-test.umd.min.js","sources":["../src/index.js"],"sourcesContent":["let x = typeof document;\\n\\nconst thing = () => {\\n  console.log(process.env.NODE_ENV);\\n};\\n\\nexport default thing;"],"names":["console","log"],"mappings":"wOAEc,KACZA,QAAQC"}
        `);
});

test("typescript declaration emit with unreferencable types emits diagnostic", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "esnext",
          module: "esnext",
          jsx: "react",
          isolatedModules: true,
          strict: true,
          moduleResolution: "node",
          esModuleInterop: true,
          noEmit: true,
        },
      },
      null,
      2
    ),
    "src/index.ts": ts`
                      import { x } from "./x";

                      export const thing = x();
                    `,
    "src/x.ts": ts`
                  class A {
                    private a?: string;
                  }

                  export const x = () => new A();
                `,
  });
  const error = await build(dir).catch((x) => x);
  expect(error).toBeInstanceOf(BatchError);
  expect(
    stripAnsi(
      error.message.replace(
        /external module "[^"]+" but cannot be named/,
        'external module "path-to-module-with-a" but cannot be named'
      )
    )
  ).toMatchInlineSnapshot(`
    "🎁 Generating TypeScript declarations for src/index.ts failed:
    🎁 src/index.ts:3:14 - error TS4023: Exported variable 'thing' has or is using name 'A' from external module "path-to-module-with-a" but cannot be named.
    🎁
    🎁 3 export const thing = x();
    🎁                ~~~~~
    🎁"
  `);
});

test("typescript declaration emit with json import", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
    }),
    ".babelrc": JSON.stringify({
      presets: [require.resolve("@babel/preset-typescript")],
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "esnext",
          module: "esnext",
          jsx: "react",
          isolatedModules: true,
          strict: true,
          moduleResolution: "node",
          esModuleInterop: true,
          resolveJsonModule: true,
          noEmit: true,
        },
      },
      null,
      2
    ),
    "src/index.ts": ts`
                      import x from "./x.json";

                      export const thing = x;
                    `,
    "src/x.json": JSON.stringify({ thing: true, other: "" }),
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/declarations/src/index.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export declare const thing: {
        thing: boolean;
        other: string;
    };

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.d.ts ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    export * from "./declarations/src/index";

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.dev.js, dist/scope-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    var x = {
    	thing: true,
    	other: ""
    };

    const thing = x;

    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./scope-test.cjs.prod.js");
    } else {
      module.exports = require("./scope-test.cjs.dev.js");
    }

  `);
});

test("bigint usage", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
      module: "dist/scope-test.esm.js",
    }),
    node_modules: {
      kind: "symlink",
      path: repoNodeModules,
    },
    "src/index.js": ts`
                      export const thing = 5n;
                    `,
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.dev.js, dist/scope-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    Object.defineProperty(exports, '__esModule', { value: true });

    const thing = 5n;

    exports.thing = thing;

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./scope-test.cjs.prod.js");
    } else {
      module.exports = require("./scope-test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    const thing = 5n;

    export { thing };

  `);
});

test("node: is external", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
      module: "dist/scope-test.esm.js",
    }),
    "src/index.js": ts`
                      import fs from "node:fs";
                      fs.writeFileSync("test.txt", "test");
                    `,
  });
  await build(dir);
  expect(await getDist(dir)).toMatchInlineSnapshot(`
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.dev.js, dist/scope-test.cjs.prod.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    var fs = require('node:fs');

    function _interopDefault (e) { return e && e.__esModule ? e : { 'default': e }; }

    var fs__default = /*#__PURE__*/_interopDefault(fs);

    fs__default['default'].writeFileSync("test.txt", "test");

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.cjs.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./scope-test.cjs.prod.js");
    } else {
      module.exports = require("./scope-test.cjs.dev.js");
    }

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ dist/scope-test.esm.js ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
    import fs from 'node:fs';

    fs.writeFileSync("test.txt", "test");

  `);
});

test("importing css fails with a nice error", async () => {
  let dir = await testdir({
    "package.json": JSON.stringify({
      name: "@scope/test",
      main: "dist/scope-test.cjs.js",
      module: "dist/scope-test.esm.js",
    }),
    "src/index.js": js`
                      import "./blah.css";
                    `,
    "src/blah.css": "",
  });
  await expect(build(dir)).rejects.toMatchInlineSnapshot(
    `[Error: 🎁 @scope/test only .ts, .tsx, .js, .jsx, and .json files can be imported but "./blah.css" is imported in "src/index.js"]`
  );
});
