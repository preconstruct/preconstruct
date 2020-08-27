// using this to avoid creating a new worker for every rollup build like rollup-plugin-terser
// https://github.com/TrySound/rollup-plugin-terser
import { codeFrameColumns } from "@babel/code-frame";
import { getWorker } from "../worker-client";
import { Plugin } from "rollup";
import { MinifyOptions } from "terser";

export default function terser(options: MinifyOptions): Plugin {
  return {
    name: "terser",
    renderChunk(code, chunk, outputOptions) {
      const normalizedOptions = {
        ...options,
        module: outputOptions.format === "es",
      };

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
    },
  };
}
