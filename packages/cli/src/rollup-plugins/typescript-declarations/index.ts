import path from "path";
import { FatalError } from "../../errors";
import { Plugin } from "rollup";
import { Package } from "../../package";
import { getDeclarations } from "./get-declarations";
import { overwriteDeclarationMapSourceRoot, tsTemplate } from "../../utils";
import normalizePath from "normalize-path";

export let isTsPath = (source: string) => /\.tsx?/.test(source);

export default function typescriptDeclarations(pkg: Package): Plugin {
  if (!pkg.entrypoints.some(({ source }) => isTsPath(source))) {
    return { name: "typescript-declarations" };
  }
  return {
    name: "typescript-declarations",
    async generateBundle(opts, bundle) {
      let declarations = await getDeclarations(
        pkg.directory,
        pkg.name,
        pkg.project.directory,
        pkg.entrypoints.map((x) => x.source)
      );

      let srcFilenameToDtsFilenameMap = new Map<string, string>();

      await Promise.all(
        [...declarations].map(async (output) => {
          srcFilenameToDtsFilenameMap.set(
            normalizePath(output.filename),
            output.types.name
          );
          this.emitFile({
            type: "asset",
            fileName: path.relative(opts.dir!, output.types.name),
            source: output.types.content,
          });

          if (output.map) {
            const sourceRoot = normalizePath(
              path.dirname(
                path.relative(path.dirname(output.map.name), output.filename)
              )
            );
            const source = overwriteDeclarationMapSourceRoot(
              output.map.content,
              sourceRoot
            );
            this.emitFile({
              type: "asset",
              fileName: path.relative(opts.dir!, output.map.name),
              source,
            });
          }
        })
      );

      for (const n in bundle) {
        const file = bundle[n];
        if (
          file.type === "asset" ||
          !file.isEntry ||
          file.facadeModuleId == null
        ) {
          continue;
        }
        const facadeModuleId = file.facadeModuleId;

        let dtsFilename = srcFilenameToDtsFilenameMap.get(
          normalizePath(facadeModuleId)
        );

        if (!dtsFilename) {
          throw new FatalError(
            `no .d.ts file was found for the entrypoint at ${facadeModuleId}`,
            pkg.name
          );
        }

        let mainFieldPath = file.fileName.replace(/\.prod\.js$/, "");
        let relativeToSource = path.relative(
          path.dirname(path.join(opts.dir!, file.fileName)),
          dtsFilename.replace(/\.d\.ts$/, "")
        );
        if (!relativeToSource.startsWith(".")) {
          relativeToSource = `./${relativeToSource}`;
        }
        let tsFileSource = tsTemplate(
          file.exports.includes("default"),
          normalizePath(relativeToSource)
        );
        let tsFileName = mainFieldPath + ".d.ts";
        this.emitFile({
          type: "asset",
          fileName: tsFileName,
          source: tsFileSource,
        });
      }
    },
  };
}
