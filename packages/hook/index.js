"use strict";
const { addHook } = require("pirates");
const babel = require("@babel/core");
const sourceMapSupport = require("source-map-support");
const path = require("path");
const url = require("url");

let EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

let babelPlugins = [
  require.resolve("@babel/plugin-transform-modules-commonjs"),
  {
    visitor: {
      MemberExpression(path, state) {
        if (
          path.node.object.type === "MetaProperty" &&
          path.node.object.meta.name === "import" &&
          path.node.object.property.name === "meta" &&
          !path.node.computed &&
          path.node.property.name === "url"
        ) {
          path.replaceWith(
            babel.types.stringLiteral(
              url.pathToFileURL(state.filename).toString()
            )
          );
        }
      },
    },
  },
];

exports.___internalHook = (distDir, relativeToRoot, relativeToPkgDir) => {
  const cwd = path.resolve(distDir, relativeToRoot);
  const pkgDir = path.resolve(distDir, relativeToPkgDir);
  let compiling = false;
  let sourceMaps = {};
  let needsToInstallSourceMapSupport = true;
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
              map,
            };
          } else {
            return null;
          }
        },
      });
      needsToInstallSourceMapSupport = false;
    }
    try {
      compiling = true;
      let output = babel.transformSync(code, {
        plugins: babelPlugins,
        filename,
        sourceMaps: "both",
        cwd,
      });
      sourceMaps[filename] = output.map;
      return output.code;
    } finally {
      compiling = false;
    }
  }

  return addHook(compileHook, {
    exts: EXTENSIONS,
    matcher: (filepath) => filepath.includes(pkgDir),
  });
};
