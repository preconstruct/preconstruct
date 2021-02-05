import { Plugin } from "rollup";

const pattern = /from (["'])@babel\/runtime(|-corejs[23])\/helpers\/(\w+)["']/g;

export default function rewriteBabelRuntimeHelpers(): Plugin {
  return {
    name: "rewrite-babel-runtime-helpers",
    renderChunk(code, chunkInfo, { format }) {
      if (format !== "es") {
        return null;
      }
      return code.replace(pattern, (_, quote, maybeCorejsBit, path) => {
        return `from ${quote}@babel/runtime${maybeCorejsBit}/helpers/esm/${path}${quote}`;
      });
    },
  };
}
