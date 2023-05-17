import normalizePath from "normalize-path";
import path from "path";
import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  TS,
} from "./common";
import { Program, ResolvedModuleFull } from "typescript";

function replaceExt(filename: string) {
  return filename.replace(/\.([cm]?ts|tsx)$/, (match) => {
    if (match === ".cts") return ".cjs";
    if (match === ".mts") return ".mjs";
    return ".js";
  });
}

export async function getUsedDeclarationsWithPackageJsonImportsReplaced(
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
  const normalizedPkgDirNodeModules = normalizePath(
    path.join(normalizedPkgDir, "node_modules")
  );
  const emitted: EmittedDeclarationOutput[] = [];

  for (const filename of depQueue) {
    const importReplacements = new Map<string, string | false>();
    const handleImport = (
      moduleSpecifier: import("typescript").StringLiteral
    ) => {
      const imported = moduleSpecifier.text;
      if (importReplacements.has(imported)) {
        const replacedImportPath = importReplacements.get(imported)!;
        if (replacedImportPath === false) {
          return;
        }
        return typescript.factory.createStringLiteral(replacedImportPath);
      }
      const resolvedModule = resolveModuleName(imported, filename);
      if (
        !resolvedModule ||
        !resolvedModule.resolvedFileName.startsWith(normalizedPkgDir) ||
        resolvedModule.resolvedFileName.startsWith(normalizedPkgDirNodeModules)
      ) {
        importReplacements.set(imported, false);
        return;
      }
      depQueue.add(resolvedModule.resolvedFileName);
      if (imported[0] !== "#") {
        importReplacements.set(imported, false);
        return;
      }
      let forImport = replaceExt(
        normalizePath(
          path.relative(path.dirname(filename), resolvedModule.resolvedFileName)
        )
      );
      if (!forImport.startsWith("../")) {
        forImport = `./${forImport}`;
      }
      importReplacements.set(imported, forImport);
      return typescript.factory.createStringLiteral(forImport);
    };
    // this is mostly sync except for one bit so running this concurrently wouldn't really help
    const output = await getDeclarationsForFile(
      filename,
      typescript,
      program,
      normalizedPkgDir,
      projectDir,
      diagnosticsHost,
      handleImport
    );
    emitted.push(output);
  }
  return emitted;
}
