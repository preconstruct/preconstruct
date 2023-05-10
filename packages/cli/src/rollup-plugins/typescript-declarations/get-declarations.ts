import { FatalError } from "../../errors";
import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  TS,
} from "./common";
import { Program, ResolvedModuleFull } from "typescript";

export async function getDeclarations(
  typescript: TS,
  program: Program,
  normalizedPkgDir: string,
  projectDir: string,
  pkgName: string,
  resolveModuleName: (
    moduleName: string,
    containingFile: string
  ) => ResolvedModuleFull | undefined,
  resolvedEntrypointSources: string[]
): Promise<EmittedDeclarationOutput[]> {
  let allDeps = new Set(resolvedEntrypointSources);

  for (let dep of allDeps) {
    let sourceFile = program.getSourceFile(dep);
    if (!sourceFile) {
      throw new FatalError(
        `Could not generate type declarations because ${dep} is not in a TypeScript project. Make sure this file is included in your tsconfig.`,
        pkgName
      );
    }
    for (let { text } of (sourceFile as any).imports) {
      let resolvedModule = resolveModuleName(text, dep);
      if (
        resolvedModule &&
        !allDeps.has(resolvedModule.resolvedFileName) &&
        !resolvedModule.isExternalLibraryImport &&
        resolvedModule.resolvedFileName.includes(normalizedPkgDir) &&
        // you can import a .json file if you have resolveJsonModule: true in your tsconfig
        // but you can't generate declarations for it(which seems fine and good i think?)
        // and just ignoring imports to them seems fine because from what i can tell
        // typescript inlines the types for them if the json file import is used in the files exports
        !resolvedModule.resolvedFileName.endsWith(".json")
      ) {
        allDeps.add(resolvedModule.resolvedFileName);
      }
    }
  }

  const diagnosticsHost = getDiagnosticsHost(typescript, projectDir);

  return Promise.all(
    [...allDeps].map((filename) => {
      return getDeclarationsForFile(
        filename,
        typescript,
        program,
        normalizedPkgDir,
        projectDir,
        diagnosticsHost
      );
    })
  );
}
