// @flow
import * as fs from "fs-extra";
import path from "path";
import { StrictEntrypoint } from "../entrypoint";

export function getDevPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".dev.js");
}

export function getProdPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".prod.js");
}

// TODO: consider putting this into rollup somehow
export function writeOtherFiles(
  entrypoint: StrictEntrypoint,
  flowMode: "named" | "all" | false
) {
  let promises = [];
  if (flowMode !== false) {
    let relativeToSource = path.relative(entrypoint.main, entrypoint.source);
    promises.push(
      fs.writeFile(
        // flow only resolves via the main field so
        // we only have to write a flow file for the main field
        path.resolve(entrypoint.directory, entrypoint.main) + ".flow",
        `// @flow
export * from "${relativeToSource}";${
          flowMode === "all"
            ? `\nexport { default } from "${relativeToSource}";`
            : ""
        }\n`
      )
    );
  }
  promises.push(
    fs.writeFile(
      path.join(entrypoint.directory, entrypoint.main),
      `'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./${path.basename(getProdPath(entrypoint.main))}");
} else {
  module.exports = require("./${path.basename(getDevPath(entrypoint.main))}");
}\n`
    )
  );
  return Promise.all(promises);
}
