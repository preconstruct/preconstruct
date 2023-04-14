import path from "path";
import { Plugin } from "rollup";
import { mjsTemplate } from "../utils";

export default function mjsProxyPlugin(): Plugin {
  return {
    name: "mjs-proxy",
    async generateBundle(opts, bundle) {
      for (const n in bundle) {
        const file = bundle[n];
        if (
          file.type === "asset" ||
          !file.isEntry ||
          file.facadeModuleId == null
        ) {
          continue;
        }

        let mjsPath = file.fileName.replace(/\.prod\.js$/, ".mjs");

        this.emitFile({
          type: "asset",
          fileName: mjsPath,
          source: mjsTemplate(
            file.exports,
            `./${path.basename(mjsPath, ".mjs")}.js`
          ),
        });
      }
    },
  };
}
