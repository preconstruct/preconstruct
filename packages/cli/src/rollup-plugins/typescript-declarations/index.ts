import path from "path";
import { FatalError } from "../../errors";
import { Plugin } from "rollup";
import fs from "fs-extra";
import { Package } from "../../package";
import { getDeclarations } from "./get-declarations";
import { dmtsTemplate, tsReexportDeclMap, dtsTemplate } from "../../utils";
import normalizePath from "normalize-path";
import { overwriteDeclarationMapSourceRoot } from "./common";

export let isTsPath = (source: string) => /\.tsx?/.test(source);

export default function typescriptDeclarations(pkg: Package): Plugin {
  return {
    name: "typescript-declarations",
    async generateBundle(opts, bundle) {
      // we want do a naive check first and go into
      // so that we can avoid some extra fs operations if there is say some .ts entrypoints
      // and some .js entrypoints with a .d.ts
      if (!pkg.entrypoints.some(({ source }) => isTsPath(source))) {
        const hasSomeDtsEntrypoints = (
          await Promise.all(
            pkg.entrypoints.map(async ({ source }) => {
              try {
                await fs.stat(source.replace(/\.jsx?/, ".d.ts"));
              } catch (err) {
                if (err.code === "ENOENT") {
                  return false;
                }
                throw err;
              }
              return true;
            })
          )
        ).some((hasDtsForEntrypoint) => hasDtsForEntrypoint);
        if (!hasSomeDtsEntrypoints) {
          return;
        }
      }

      const {
        declarations,
        entrypointSourceToTypeScriptSource,
      } = await getDeclarations(
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

        const typeScriptSource = entrypointSourceToTypeScriptSource.get(
          normalizePath(facadeModuleId)
        );

        if (!typeScriptSource) {
          const moduleInfo = this.getModuleInfo(file.facadeModuleId);
          // this will happen for "use client" modules where it's not
          // an actual entrypoint but it is a Rollup entry
          if (moduleInfo?.meta.useClientReferenceId) {
            continue;
          }
          // otherwise, a user should never be able to cause this to happen
          throw new FatalError(
            `no TypeScript source file was found for the entrypoint at ${facadeModuleId}`,
            pkg.name
          );
        }

        let dtsFilename = srcFilenameToDtsFilenameMap.get(
          normalizePath(typeScriptSource)
        );

        if (!dtsFilename) {
          // a user should never be able to cause this to happen
          throw new FatalError(
            `no .d.ts file was found for the source at ${typeScriptSource}`,
            pkg.name
          );
        }

        let mainFieldPath = file.fileName.replace(/\.prod\.js$/, "");
        let relativeToSource = normalizePath(
          path.relative(
            path.dirname(path.join(opts.dir!, file.fileName)),
            dtsFilename.replace(/\.d\.ts$/, "")
          )
        );
        if (!relativeToSource.startsWith(".")) {
          relativeToSource = `./${relativeToSource}`;
        }
        const dtsFileName = `${mainFieldPath}.d.ts`;
        const baseDtsFilename = path.basename(dtsFileName);
        // TODO: technically this is wrong because you could have a default type-only export
        // (though i doubt that is very common)
        const hasDefaultExport = file.exports.includes("default");
        const dtsFileSource = dtsTemplate(
          baseDtsFilename,
          hasDefaultExport,
          relativeToSource
        );
        this.emitFile({
          type: "asset",
          fileName: dtsFileName,
          source: dtsFileSource,
        });
        this.emitFile({
          type: "asset",
          fileName: `${dtsFileName}.map`,
          source: tsReexportDeclMap(
            baseDtsFilename,
            `${relativeToSource}.d.ts`
          ),
        });

        if (
          pkg.exportsFieldConfig()?.importDefaultExport === "unwrapped-default"
        ) {
          const dmtsFilename = dtsFileName.replace(/\.d\.ts$/, ".d.mts");
          const basedmtsFilename = baseDtsFilename.replace(
            /\.d\.ts$/,
            ".d.mts"
          );
          this.emitFile({
            type: "asset",
            fileName: dmtsFilename,
            source: dmtsTemplate(
              basedmtsFilename,
              hasDefaultExport,
              `${relativeToSource}.js`
            ),
          });
          this.emitFile({
            type: "asset",
            fileName: `${dmtsFilename}.map`,
            source: tsReexportDeclMap(
              basedmtsFilename,
              `${relativeToSource}.d.ts`
            ),
          });
        }
      }
    },
  };
}
