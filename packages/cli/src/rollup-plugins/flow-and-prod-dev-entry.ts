import path from "path";
import { Plugin } from "rollup";
import { getDevPath, getProdPath } from "../build/utils";
import { flowTemplate } from "../utils";

import * as fs from "fs-extra";
import normalizePath from "normalize-path";

export default function flowAndNodeDevProdEntry(): Plugin {
  return {
    name: "flow-and-prod-dev-entry",
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
        let relativeToSource = path.relative(
          path.dirname(path.join(opts.dir!, file.fileName)),
          file.facadeModuleId
        );

        let isEntrySourceTypeScript = /\.tsx?$/.test(file.facadeModuleId);

        if (!isEntrySourceTypeScript) {
          let flowMode: false | "all" | "named" = false;
          let source = await fs.readFile(file.facadeModuleId, "utf8");
          if (source.includes("@flow")) {
            flowMode = file.exports.includes("default") ? "all" : "named";
          }

          if (flowMode !== false) {
            let flowFileSource = flowTemplate(
              flowMode === "all",
              normalizePath(relativeToSource)
            );
            let flowFileName = mainFieldPath + ".flow";
            this.emitFile({
              type: "asset",
              fileName: flowFileName,
              source: flowFileSource,
            });
          }
        }

        let mainEntrySource = `'use strict';

if (${
          // tricking static analysis is fun...
          "process" + ".env.NODE_ENV"
        } === "production") {
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
