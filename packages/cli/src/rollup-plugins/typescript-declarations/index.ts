import path from "path";
import { FatalError } from "../../errors";
import { Plugin } from "rollup";
import fs from "fs-extra";
import { Package } from "../../package";
import { getDeclarations } from "./get-declarations";
import {
  dmtsTemplate,
  tsReexportDeclMap,
  dtsTemplate,
  getDtsDefaultForMtsFilepath,
  dtsDefaultForDmtsTemplate,
} from "../../utils";
import normalizePath from "normalize-path";
import {
  getProgram,
  loadTypeScript,
  overwriteDeclarationMapSourceRoot,
} from "./common";
import { getUsedDeclarations } from "./get-used-declarations";
import { getUsedDeclarationsWithPackageJsonImportsReplaced } from "./get-used-declaration-with-replacing";

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

      const typescript = loadTypeScript(
        pkg.directory,
        pkg.project.directory,
        pkg.name
      );

      const { program, options } = await getProgram(
        pkg.directory,
        pkg.name,
        typescript
      );

      let normalizedDirname = normalizePath(pkg.directory);

      let moduleResolutionCache = typescript.createModuleResolutionCache(
        normalizedDirname,
        (x) => x,
        options
      );

      const resolveModule = (moduleName: string, containingFile: string) => {
        let { resolvedModule } = typescript.resolveModuleName(
          moduleName,
          containingFile,
          options,
          typescript.sys,
          moduleResolutionCache
        );
        return resolvedModule;
      };

      const entrypointSourceToTypeScriptSource: ReadonlyMap<
        string,
        string
      > = new Map(
        pkg.entrypoints.map((entrypoint) => {
          const x = entrypoint.source;
          let resolvedModule = resolveModule(
            path.join(path.dirname(x), path.basename(x, path.extname(x))),
            pkg.directory
          );
          if (!resolvedModule) {
            throw new Error(
              "This is an internal error, please open an issue if you see this: ts could not resolve module"
            );
          }
          return [normalizePath(x), resolvedModule.resolvedFileName];
        })
      );

      const declarations = await (pkg.project.experimentalFlags
        .importsConditions
        ? getUsedDeclarationsWithPackageJsonImportsReplaced(
            typescript,
            program,
            normalizedDirname,
            pkg.project.directory,
            resolveModule,
            [...entrypointSourceToTypeScriptSource.values()]
          )
        : pkg.project.experimentalFlags.onlyEmitUsedTypeScriptDeclarations
        ? getUsedDeclarations(
            typescript,
            program,
            normalizedDirname,
            pkg.project.directory,
            resolveModule,
            [...entrypointSourceToTypeScriptSource.values()]
          )
        : getDeclarations(
            typescript,
            program,
            normalizedDirname,
            pkg.project.directory,
            pkg.name,
            resolveModule,
            [...entrypointSourceToTypeScriptSource.values()]
          ));

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
          // will happen when only some entrypoints are TypeScript
          continue;
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
          pkg.exportsFieldConfig()?.importConditionDefaultExport === "default"
        ) {
          const dmtsFilename = dtsFileName.replace(/\.d\.ts$/, ".d.mts");
          const basedmtsFilename = baseDtsFilename.replace(
            /\.d\.ts$/,
            ".d.mts"
          );
          const sourceWithExtension = `${relativeToSource}.js`;

          this.emitFile({
            type: "asset",
            fileName: dmtsFilename,
            source: dmtsTemplate(
              basedmtsFilename,
              hasDefaultExport,
              sourceWithExtension
            ),
          });
          if (hasDefaultExport) {
            this.emitFile({
              type: "asset",
              fileName: getDtsDefaultForMtsFilepath(dmtsFilename),
              source: dtsDefaultForDmtsTemplate(sourceWithExtension),
            });
          }
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
