// @flow
import globby from "globby";
import type { Plugin } from "../types";
import { Package } from "../../package";
import { createDeclarationCreator } from "./create-generator";

export default function typescriptDeclarations(pkg: Package): Plugin {
  let entrypointSourceFiles = pkg.entrypoints.map(x => x.source);

  if (!entrypointSourceFiles.some(x => /\.tsx?/.test(x))) {
    return { name: "typescript-declarations" };
  }
  return {
    name: "typescript-declarations",

    // eslint-disable-next-line no-unused-vars
    async generateBundle(opts, bundle, something) {
      let creator = await createDeclarationCreator(pkg.directory);

      let tsFiles = await globby(
        ["**/*.ts{,x}", "!**/*.d.ts", "!node_modules"],
        {
          cwd: pkg.directory,
          absolute: true
        }
      );

      for (let filename of tsFiles) {
        let { name, content } = creator(filename);
        bundle[name] = {
          fileName: name,
          isAsset: true,
          source: content
        };
      }
    }
  };
}
