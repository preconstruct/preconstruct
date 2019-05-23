// @flow
import fs from "fs-extra";
import resolveFrom from "resolve-from";
import path from "path";
import { FatalError } from "../../errors";
import type { Plugin } from "../types";
import { Package } from "../../package";
import { createDeclarationCreator } from "./create-generator";

let unsafeRequire = require;

let isTsPath = source => /\.tsx?/.test(source);

function tsTemplate(hasDefaultExport: boolean, relativePath: string) {
  return `export * from "${relativePath}";${
    hasDefaultExport ? `\nexport { default } from "${relativePath}";` : ""
  }\n`;
}

export default function typescriptDeclarations(pkg: Package): Plugin {
  if (!pkg.entrypoints.some(({ source }) => isTsPath(source))) {
    return { name: "typescript-declarations" };
  }

  let typescript;
  try {
    typescript = unsafeRequire(resolveFrom(pkg.directory, "typescript"));
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      throw new Error(
        "an entrypoint source file ends with the .ts or .tsx extension but the typescript module could not be resolved from the project directory, please install it."
      );
    }
    throw err;
  }
  let configFileName = typescript.findConfigFile(
    pkg.directory,
    typescript.sys.fileExists
  );
  if (!configFileName) {
    throw new Error(
      "an entrypoint source file ends with the the .ts or .tsx extension but no TypeScript config exists, please create one."
    );
  }

  return {
    name: "typescript-declarations",

    // eslint-disable-next-line no-unused-vars
    async generateBundle(opts, bundle, something) {
      let creator = await createDeclarationCreator(
        typescript,
        configFileName,
        pkg.directory
      );

      let declarations = new Map<string, { name: string, content: string }>();

      for (const n in bundle) {
        const file = bundle[n];
        if (file.isAsset) {
          continue;
        }

        for (let mod in file.modules) {
          if (!declarations.has(mod)) {
            declarations.set(mod, creator(mod));
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
            `no dts file was found for the entrypoint at ${facadeModuleId} ${JSON.stringify(
              [...srcFilenameToDtsFilenameMap.keys()]
            )}`,
            pkg
          );
        }

        let mainFieldPath = file.fileName.replace(/\.prod\.js$/, ".js");
        let relativeToSource = path.relative(
          path.dirname(path.join(opts.dir, file.fileName)),
          dtsFilename
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
