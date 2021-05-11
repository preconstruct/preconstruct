import path from "path";
import { FatalError } from "../../errors";
import { Plugin } from "rollup";
import { Package } from "../../package";
import { createDeclarationCreator } from "./create-generator";
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
      let creator = await createDeclarationCreator(
        pkg.directory,
        pkg.name,
        pkg.project
      );

      let srcFilenameToDtsFilenameMap = new Map<string, string>();

      let deps = creator.getDeps(pkg.entrypoints.map((x) => x.source));
      await Promise.all(
        [...deps].map(async (dep) => {
          let { types, map } = await creator.getDeclarationFiles(dep);

          srcFilenameToDtsFilenameMap.set(normalizePath(dep), types.name);
          this.emitFile({
            type: "asset",
            fileName: path.relative(opts.dir!, types.name),
            source: types.content,
          });

          if (map) {
            const sourceRoot = normalizePath(
              path.dirname(path.relative(path.dirname(map.name), dep))
            );
            const source = overwriteDeclarationMapSourceRoot(
              map.content,
              sourceRoot
            );
            this.emitFile({
              type: "asset",
              fileName: path.relative(opts.dir!, map.name),
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
