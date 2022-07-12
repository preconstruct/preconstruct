import path from "path";
import { FatalError } from "../../errors";
import normalizePath from "normalize-path";
import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  getProgram,
  loadTypeScript,
} from "./common";

export async function getDeclarations(
  dirname: string,
  pkgName: string,
  projectDir: string,
  entrypoints: string[]
): Promise<{
  entrypointSourceToTypeScriptSource: ReadonlyMap<string, string>;
  declarations: EmittedDeclarationOutput[];
}> {
  const typescript = loadTypeScript(dirname, projectDir, pkgName);

  const { program, options } = await getProgram(dirname, pkgName, typescript);
  let moduleResolutionCache = typescript.createModuleResolutionCache(
    dirname,
    (x) => x,
    options
  );
  let normalizedDirname = normalizePath(dirname);

  // these will be distinct when using .d.ts files
  const entrypointSourceToTypeScriptSource: ReadonlyMap<
    string,
    string
  > = new Map(
    entrypoints.map((x) => {
      let { resolvedModule } = typescript.resolveModuleName(
        path.join(path.dirname(x), path.basename(x, path.extname(x))),
        dirname,
        options,
        typescript.sys,
        moduleResolutionCache
      );
      if (!resolvedModule) {
        throw new Error(
          "This is an internal error, please open an issue if you see this: ts could not resolve module"
        );
      }
      return [normalizePath(x), resolvedModule.resolvedFileName];
    })
  );
  let allDeps = new Set<string>(entrypointSourceToTypeScriptSource.values());

  function searchDeps(deps: Set<string>) {
    for (let dep of deps) {
      let sourceFile = program!.getSourceFile(dep);
      if (!sourceFile) {
        throw new FatalError(
          `Could not generate type declarations because ${dep} is not in a TypeScript project. Make sure this file is included in your tsconfig.`,
          pkgName
        );
      }
      let internalDeps = new Set<string>();
      for (let { text } of (sourceFile as any).imports) {
        let { resolvedModule } = typescript.resolveModuleName(
          text,
          dep,
          options,
          typescript.sys,
          moduleResolutionCache
        );
        if (resolvedModule) {
          if (
            !allDeps.has(resolvedModule.resolvedFileName) &&
            !resolvedModule.isExternalLibraryImport &&
            resolvedModule.resolvedFileName.includes(normalizedDirname) &&
            // you can import a .json file if you have resolveJsonModule: true in your tsconfig
            // but you can't generate declarations for it(which seems fine and good i think?)
            // and just ignoring imports to them seems fine because from what i can tell
            // typescript inlines the types for them if the json file import is used in the files exports
            !resolvedModule.resolvedFileName.endsWith(".json")
          ) {
            internalDeps.add(resolvedModule.resolvedFileName);
            allDeps.add(resolvedModule.resolvedFileName);
          }
        }
      }
      searchDeps(internalDeps);
    }
  }
  searchDeps(new Set(entrypointSourceToTypeScriptSource.values()));

  const diagnosticsHost = getDiagnosticsHost(typescript, projectDir);

  return {
    entrypointSourceToTypeScriptSource,
    declarations: await Promise.all(
      [...allDeps].map((filename) => {
        return getDeclarationsForFile(
          filename,
          typescript,
          program,
          normalizedDirname,
          projectDir,
          diagnosticsHost
        );
      })
    ),
  };
}
