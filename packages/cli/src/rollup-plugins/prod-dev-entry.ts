import path from "path";
import { Plugin } from "rollup";
import { getDevPath, getProdPath } from "../build/utils";

export default function nodeDevProdEntry(): Plugin {
  return {
    name: "prod-dev-entry",
    async generateBundle(opts, bundle) {
      for (const n in bundle) {
        const file = bundle[n];
        if (
          file.type === "asset" ||
          !(file.type === "chunk" && file.isEntry) ||
          file.facadeModuleId == null
        ) {
          continue;
        }

        let mainFieldPath = file.fileName.replace(/\.prod\.js$/, ".js");

        let mainEntrySource = `'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./${path.basename(getProdPath(mainFieldPath))}");
} else {
  module.exports = require("./${path.basename(getDevPath(mainFieldPath))}");
}\n`;
        this.emitFile({
          type: "asset",
          fileName: mainFieldPath,
          source: mainEntrySource,
        });
      }
    },
  };
}
