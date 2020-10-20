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
    dist/test.cjs.dev.js -------------
    'use strict';

    process.env.NODE_ENV = "development";
    something12.process.env.NODE_ENV = "development";
    console.log(process.env.NODE_ENV);
    console.log(something.process.env.NODE_ENV);

    dist/test.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    dist/test.cjs.prod.js -------------
    "use strict";

    process.env.NODE_ENV = "development", something12.process.env.NODE_ENV = "development", 
    console.log("production"), console.log(something.process.env.NODE_ENV);

  `);
});

test("process.env.NODE_ENV reassignment new approach", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "test",
      main: "dist/test.cjs.js",
      preconstruct: {
        ___experimentalFlags_WILL_CHANGE_IN_PATCH: {
          newProcessEnvNodeEnvReplacementStrategyAndSkipTerserOnCJSProdBuild: true,
        },
      },
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
    dist/test.cjs.dev.js -------------
    'use strict';

    process.env.NODE_ENV = "development";
    something12.process.env.NODE_ENV = "development";
    console.log(process.env.NODE_ENV);
    console.log(something.process.env.NODE_ENV);

    dist/test.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    dist/test.cjs.prod.js -------------
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
    dist/test.cjs.dev.js -------------
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

    dist/test.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    dist/test.cjs.prod.js -------------
    "use strict";

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) throw new TypeError("Cannot call a class as a function");
    }

    Object.defineProperty(exports, "__esModule", {
      value: !0
    });

    var Other = function Other() {
      _classCallCheck(this, Other);
    }, Thing = function Thing() {
      _classCallCheck(this, Thing);
    };

    exports.Other = Other, exports.Thing = Thing;

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
    dist/test.cjs.dev.js -------------
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

    dist/test.cjs.js -------------
    'use strict';

    if (process.env.NODE_ENV === "production") {
      module.exports = require("./test.cjs.prod.js");
    } else {
      module.exports = require("./test.cjs.dev.js");
    }

    dist/test.cjs.prod.js -------------
    "use strict";

    function _arrayLikeToArray(arr, len) {
      (null == len || len > arr.length) && (len = arr.length);
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (o) {
        if ("string" == typeof o) return _arrayLikeToArray(o, minLen);
        var n = Object.prototype.toString.call(o).slice(8, -1);
        return "Object" === n && o.constructor && (n = o.constructor.name), "Map" === n || "Set" === n ? Array.from(n) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? _arrayLikeToArray(o, minLen) : void 0;
      }
    }

    function _createForOfIteratorHelper(o) {
      if ("undefined" == typeof Symbol || null == o[Symbol.iterator]) {
        if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) {
          var i = 0, F = function() {};
          return {
            s: F,
            n: function() {
              return i >= o.length ? {
                done: !0
              } : {
                done: !1,
                value: o[i++]
              };
            },
            e: function(e) {
              throw e;
            },
            f: F
          };
        }
        throw new TypeError("Invalid attempt to iterate non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      var it, err, normalCompletion = !0, didErr = !1;
      return {
        s: function() {
          it = o[Symbol.iterator]();
        },
        n: function() {
          var step = it.next();
          return normalCompletion = step.done, step;
        },
        e: function(e) {
          didErr = !0, err = e;
        },
        f: function() {
          try {
            normalCompletion || null == it.return || it.return();
          } finally {
            if (didErr) throw err;
          }
        }
      };
    }

    var _step, _iterator = _createForOfIteratorHelper(something);

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done; ) var x = _step.value;
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var _step$1, _iterator$1 = _createForOfIteratorHelper(something);

    try {
      for (_iterator$1.s(); !(_step$1 = _iterator$1.n()).done; ) var x$1 = _step$1.value;
    } catch (err) {
      _iterator$1.e(err);
    } finally {
      _iterator$1.f();
    }

  `);
});
