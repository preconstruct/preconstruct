// @flow
let { EXTENSIONS } = require("./constants");
let { addHook } = require("pirates");
let babel = require("@babel/core");
let sourceMapSupport = require("source-map-support");

let babelPlugins = [
  require.resolve("@babel/plugin-transform-runtime"),
  require.resolve("@babel/plugin-transform-modules-commonjs")
];

exports.___internalHook = () => {
  let compiling = false;

  function compileHook(code, filename) {
    if (compiling) return code;

    try {
      compiling = true;
      return babel.transformSync(code, {
        plugins: babelPlugins,
        filename,
        sourceMaps: "inline"
      }).code;
    } finally {
      compiling = false;
    }
  }
  sourceMapSupport.install({ environment: "node", hookRequire: true });

  return addHook(compileHook, {
    exts: EXTENSIONS
  });
};
