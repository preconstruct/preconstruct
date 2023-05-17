import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  TS,
} from "./common";
import { Program, ResolvedModuleFull } from "typescript";

export async function getUsedDeclarations(
  typescript: TS,
  program: Program,
  normalizedPkgDir: string,
  projectDir: string,
  resolveModuleName: (
    moduleName: string,
    containingFile: string
  ) => ResolvedModuleFull | undefined,
  resolvedEntrypointSources: string[]
): Promise<EmittedDeclarationOutput[]> {
  const depQueue = new Set(resolvedEntrypointSources);
  const diagnosticsHost = getDiagnosticsHost(typescript, projectDir);

  const emitted: EmittedDeclarationOutput[] = [];

  for (const filename of depQueue) {
    // this is mostly sync except for one bit so running this concurrently wouldn't really help
    const output = await getDeclarationsForFile(
      filename,
      typescript,
      program,
      normalizedPkgDir,
      projectDir,
      diagnosticsHost,
      (imported) => {
        const resolvedModule = resolveModuleName(imported, filename);
        if (
          resolvedModule &&
          !resolvedModule.isExternalLibraryImport &&
          resolvedModule.resolvedFileName.includes(normalizedPkgDir)
        ) {
          depQueue.add(resolvedModule.resolvedFileName);
        }

        return imported;
      }
    );
    emitted.push(output);
  }
  return emitted;
}
