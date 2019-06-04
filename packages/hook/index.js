// @flow
"use strict";
let { addHook } = require("pirates");
let babel = require("@babel/core");
let sourceMapSupport = require("source-map-support");

let EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

let babelPlugins = [
  require.resolve("@babel/plugin-transform-runtime"),
  require.resolve("@babel/plugin-transform-modules-commonjs")
];

exports.___internalHook = (cwd /*:string*/) => {
  let compiling = false;
  let sourceMaps = {};
  let needsToInstallSourceMapSupport = false;
  function compileHook(code, filename) {
    if (compiling) return code;
    // we do this lazily because jest has its own require implementation
    // which means preconstruct's require hook won't be run
    // so we don't want to install source map support because that will mess up
    // jest's source map support
    if (needsToInstallSourceMapSupport) {
      sourceMapSupport.install({
        environment: "node",
        retrieveSourceMap(source) {
          let map = sourceMaps[source];
          if (map !== undefined) {
            return {
              url: source,
              map
            };
          } else {
            return null;
          }
        }
      });
      needsToInstallSourceMapSupport = false;
    }
    try {
      compiling = true;
      let output = babel.transformSync(code, {
        plugins: babelPlugins,
        filename,
        sourceMaps: "both",
        cwd
      });
      sourceMaps[filename] = output.map;
      return output.code;
    } finally {
      compiling = false;
    }
  }

  return addHook(compileHook, {
    exts: EXTENSIONS
  });
};
