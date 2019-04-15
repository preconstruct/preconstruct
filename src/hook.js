// @flow
import { EXTENSIONS } from "./constants";
import { addHook } from "pirates";
import * as babel from "@babel/core";
import sourceMapSupport from "source-map-support";

let babelPlugins = [
  require.resolve("@babel/plugin-transform-runtime"),
  require.resolve("@babel/plugin-transform-modules-commonjs")
];

export let ___internalHook = () => {
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
