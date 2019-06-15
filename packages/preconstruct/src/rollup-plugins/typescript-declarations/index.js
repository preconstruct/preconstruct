// @flow
import path from "path";
import { FatalError } from "../../errors";
import type { Plugin } from "../types";
import { Package } from "../../package";
import { createDeclarationCreator } from "./create-generator";
import { tsTemplate } from "../../utils";

let isTsPath = source => /\.tsx?/.test(source);

export default function typescriptDeclarations(pkg: Package): Plugin {
  if (!pkg.entrypoints.some(({ source }) => isTsPath(source))) {
    return { name: "typescript-declarations" };
  }
  return {
    name: "typescript-declarations",

    // eslint-disable-next-line no-unused-vars
    async generateBundle(opts, bundle, something) {
      let creator = await createDeclarationCreator(pkg.directory);

      let srcFilenameToDtsFilenameMap = new Map<string, string>();

      let doneModules = new Set();

      for (const n in bundle) {
        const file = bundle[n];
        if (file.isAsset) {
          continue;
        }

        for (let mod in file.modules) {
          if (!doneModules.has(mod)) {
            doneModules.add(mod);
            let { name, content } = creator(mod);
            srcFilenameToDtsFilenameMap.set(mod, name);
            bundle[name] = {
              fileName: name,
              isAsset: true,
              source: content
            };
          }
        }
      }

      for (const n in bundle) {
        const file = bundle[n];
        // $FlowFixMe
        let facadeModuleId = file.facadeModuleId;
        if (file.isAsset || !file.isEntry || facadeModuleId == null) {
          continue;
        }

        let dtsFilename = srcFilenameToDtsFilenameMap.get(facadeModuleId);

        if (!dtsFilename) {
          throw new FatalError(
            `no .d.ts file was found for the entrypoint at ${facadeModuleId}`,
            pkg.name
          );
        }

        let mainFieldPath = file.fileName.replace(/\.prod\.js$/, "");
        let relativeToSource = path.relative(
          path.dirname(path.join(opts.dir, file.fileName)),
          dtsFilename.replace(/\.d\.ts$/, "")
        );
        if (!relativeToSource.startsWith(".")) {
          relativeToSource = `./${relativeToSource}`;
        }
        let tsFileSource = tsTemplate(
          file.exports.includes("default"),
          relativeToSource
        );
        let tsFileName = mainFieldPath + ".d.ts";
        bundle[tsFileName] = {
          fileName: tsFileName,
          isAsset: true,
          source: tsFileSource
        };
      }
    }
  };
}
