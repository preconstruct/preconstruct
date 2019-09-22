// using this to avoid creating a new worker for every rollup build like rollup-plugin-terser
// https://github.com/TrySound/rollup-plugin-terser
import { codeFrameColumns } from "@babel/code-frame";
import { getWorker } from "../worker-client";
import { Plugin } from "rollup";

export default function terser(userOptions: any = {}): Plugin {
  if (userOptions.sourceMap != null) {
    throw Error("sourceMap option is removed, use sourcemap instead");
  }

  return {
    name: "terser",
    renderChunk(code, chunk, outputOptions) {
      const normalizedOptions = {
        ...userOptions,
        sourceMap: userOptions.sourcemap !== false,
        module: outputOptions.format === "es" || outputOptions.format === "esm"
      };

      if (normalizedOptions.hasOwnProperty("sourcemap")) {
        delete normalizedOptions["sourcemap"];
      }

      const result = getWorker()
        .transformTerser(code, JSON.stringify(normalizedOptions))
        .catch((error: any) => {
          const { message, line, col: column } = error;
          console.error(
            codeFrameColumns(code, { start: { line, column } }, { message })
          );
          throw error;
        });

      return result;
    }
  };
}
