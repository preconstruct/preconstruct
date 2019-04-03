// @flow
import path from "path";
import type { Plugin } from "./types";

export default function flowEntry(): Plugin {
  return {
    name: "flow-and-prod-dev-entry",

    generateBundle(opts, bundle, something) {
      const outDir = opts.dir;

      for (const n in bundle) {
        const file = bundle[n];
        if (file.isAsset || !file.isEntry || file.facadeModuleId == null) {
          continue;
        }
        let flowMode = false;
        if (source.includes("@flow")) {
          flowMode = thing.exports.includes("default") ? "all" : "named";
        }

        let relativeToSource = path.relative(opts.dir, file.facadeModuleId);
        `// @flow
          export * from "${relativeToSource}";${
          flowMode === "all"
            ? `\nexport { default } from "${relativeToSource}";`
            : ""
        }\n`;
        const fileName = file.fileName + ".flow";
        bundle[fileName] = { fileName, isAsset: true, source };
      }
    }
  };
}
