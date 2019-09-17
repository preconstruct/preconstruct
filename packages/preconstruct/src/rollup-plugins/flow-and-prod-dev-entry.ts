import path from "path";
import type { Plugin } from "./types";
import { getDevPath, getProdPath } from "../build/utils";
import { flowTemplate } from "../utils";
import { Package } from "../package";
import { FatalError } from "../errors";

import * as fs from "fs-extra";

export default function flowAndNodeDevProdEntry(pkg: Package): Plugin {
  return {
    name: "flow-and-prod-dev-entry",
    async resolveId(source: string, importer: string) {
      let resolved = await this.resolve(source, importer, { skipSelf: true });

      if (
        resolved.id.startsWith("\0") ||
        resolved.id.startsWith(pkg.directory)
      ) {
        return resolved;
      }
      throw new FatalError(
        `all relative imports in a package should only import modules inside of their package directory but "${path.relative(
          pkg.directory,
          importer
        )}" is importing "${source}"`,
        pkg.name
      );
    },
    // eslint-disable-next-line no-unused-vars
    async generateBundle(opts, bundle, something) {
      for (const n in bundle) {
        const file = bundle[n];
        // $FlowFixMe
        let facadeModuleId = file.facadeModuleId;
        if (file.isAsset || !file.isEntry || facadeModuleId == null) {
          continue;
        }

        let mainFieldPath = file.fileName.replace(/\.prod\.js$/, ".js");
        let relativeToSource = path.relative(
          path.dirname(path.join(opts.dir, file.fileName)),
          facadeModuleId
        );

        let isEntrySourceTypeScript = /\.tsx?$/.test(facadeModuleId);

        if (!isEntrySourceTypeScript) {
          let flowMode = false;

          let source = await fs.readFile(facadeModuleId, "utf8");
          if (source.includes("@flow")) {
            flowMode = file.exports.includes("default") ? "all" : "named";
          }

          if (flowMode !== false) {
            let flowFileSource = flowTemplate(
              flowMode === "all",
              relativeToSource
            );
            let flowFileName = mainFieldPath + ".flow";
            bundle[flowFileName] = {
              fileName: flowFileName,
              isAsset: true,
              source: flowFileSource
            };
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
        bundle[mainFieldPath] = {
          fileName: mainFieldPath,
          isAsset: true,
          source: mainEntrySource
        };
      }
    }
  };
}
