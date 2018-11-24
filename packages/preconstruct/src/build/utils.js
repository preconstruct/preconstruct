// @flow
import * as fs from "fs-extra";
import path from "path";
import { StrictPackage } from "../package";

export function getDevPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".dev.js");
}

export function getProdPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".prod.js");
}

export function writeOtherFiles(
  pkg: StrictPackage,
  flowMode: "named" | "all" | false
) {
  let promises = [];
  if (flowMode !== false) {
    promises.push(
      fs.writeFile(
        // flow only resolves via the main field so
        // we only have to write a flow file for the main field
        path.resolve(pkg.directory, pkg.main) + ".flow",
        `// @flow
export * from "../src/index.js";${
          flowMode === "all"
            ? `\nexport { default } from "../src/index.js";`
            : ""
        }\n`
      )
    );
  }
  promises.push(
    fs.writeFile(
      path.join(pkg.directory, pkg.main),
      `'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./${path.basename(getProdPath(pkg.main))}");
} else {
  module.exports = require("./${path.basename(getDevPath(pkg.main))}");
}\n`
    )
  );
  return Promise.all(promises);
}
