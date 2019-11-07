import { Plugin } from "rollup";

const pattern = /from (["'])@babel\/runtime\/helpers\/(\w+)["']/g;

export default function rewriteBabelRuntimeHelpers(): Plugin {
  return {
    name: "rewrite-babel-runtime-helpers",
    renderChunk(code, chunkInfo, { format }) {
      if (format !== "esm" && format !== "es") {
        return null;
      }
      return code.replace(pattern, (_, quote, path) => {
        return `from ${quote}@babel/runtime/helpers/esm/${path}${quote}`;
      });
    }
  };
}
