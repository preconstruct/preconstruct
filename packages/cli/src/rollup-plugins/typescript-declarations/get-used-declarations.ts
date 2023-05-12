import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  TS,
} from "./common";
import { Program, ResolvedModuleFull } from "typescript";
import { getModuleSpecifier } from "./get-module-specifier";

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
    const imports = new Set<string>();
    // this is mostly sync except for one bit so running this concurrently wouldn't really help
    const output = await getDeclarationsForFile(
      filename,
      typescript,
      program,
      normalizedPkgDir,
      projectDir,
      diagnosticsHost,
      {
        afterDeclarations: [
          () => (node) => {
            // typescript has a exportedModulesFromDeclarationEmit property
            // on these source files, it's marked @internal though so i'm not using it
            // might want to detect at runtime if it exists and use it in that case otherwise defer to this
            // i'm not terribly worried though
            // you should not have massive declarations files in the way that having massive source
            // files is actually reasonable
            if (typescript.isSourceFile(node)) {
              function handler(node: import("typescript").Node): void {
                const literal = getModuleSpecifier(node, typescript);
                if (literal) {
                  imports.add(literal.text);
                }
                typescript.forEachChild(node, handler);
              }
              handler(node);
              return node;
            }
            return node;
          },
        ],
      }
    );
    emitted.push(output);
    for (const imported of imports) {
      const resolvedModule = resolveModuleName(imported, filename);
      if (
        resolvedModule &&
        !resolvedModule.isExternalLibraryImport &&
        resolvedModule.resolvedFileName.includes(normalizedPkgDir)
      ) {
        depQueue.add(resolvedModule.resolvedFileName);
      }
    }
  }
  return emitted;
}
