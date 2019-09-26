import { Plugin } from "rollup";

const pattern = /require\((["'])@babel\/runtime\/helpers\/esm\/(\w+)["']\)/g;

export default function rewriteCjsRuntimeHelpers(): Plugin {
  return {
    name: "rewrite-cjs-runtime-helpers",
    renderChunk(code, chunkInfo, { format }) {
      if (format !== "cjs") {
        return null;
      }
      return code.replace(pattern, (_, quote, path) => {
        return `require(${quote}@babel/runtime/helpers/${path}${quote})`;
      });
    }
  };
}
