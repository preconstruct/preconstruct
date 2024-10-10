import path from "node:path";
import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  TS,
} from "./common";
import { Program, ResolvedModuleFull } from "typescript";
import { FatalError } from "../../errors";
import { Package } from "../../package";
import { normalizePath } from "../../utils";

function replaceExt(filename: string) {
  return filename.replace(/(\.d)?\.([cm]?ts|tsx)$/, (match, p1, p2) => {
    if (p2 === ".cts") return ".cjs";
    if (p2 === ".mts") return ".mjs";
    return ".js";
  });
}

function checkTypeImportDeclaredInDeps(
  resolved: string,
  pkg: Package,
  filename: () => string
) {
  const split = normalizePath(resolved).split("/");
  const lastNodeModulesIndex = split.lastIndexOf("node_modules");
  if (lastNodeModulesIndex === -1) return;
  let pkgNameOrScope = split[lastNodeModulesIndex + 1];
  if (!pkgNameOrScope) return;
  if (pkgNameOrScope.startsWith("@")) {
    const scopedPkgName = split[lastNodeModulesIndex + 2];
    if (!scopedPkgName) return;
    pkgNameOrScope += "/" + scopedPkgName;
  }
  const dep =
    pkg.json.dependencies?.[pkgNameOrScope] ||
    pkg.json.peerDependencies?.[pkgNameOrScope];
  if (!dep) {
    throw new FatalError(
      `dependency ${JSON.stringify(
        pkgNameOrScope
      )} used by types for ${filename()} is not declared in dependencies or peerDependencies`,
      pkg.name
    );
  }
}

export function getDeclarationsWithImportedModuleSpecifiersReplacing(
  typescript: TS,
  program: Program,
  normalizedPkgDir: string,
  pkg: Package,
  resolveModuleName: (
    moduleName: string,
    containingFile: string
  ) => ResolvedModuleFull | undefined,
  resolvedEntrypointSources: string[]
): EmittedDeclarationOutput[] {
  const projectDir = pkg.project.directory;
  const depQueue = new Set(resolvedEntrypointSources);
  const diagnosticsHost = getDiagnosticsHost(typescript, projectDir);
  const normalizedPkgDirNodeModules = normalizePath(
    path.join(normalizedPkgDir, "node_modules")
  );
  const emitted: EmittedDeclarationOutput[] = [];
  const { checkTypeDependencies } = pkg.project.experimentalFlags;

  for (const filename of depQueue) {
    const handleImport = (imported: string): string => {
      const resolvedModule = resolveModuleName(imported, filename);
      if (
        !resolvedModule ||
        !resolvedModule.resolvedFileName.startsWith(normalizedPkgDir) ||
        resolvedModule.resolvedFileName.startsWith(normalizedPkgDirNodeModules)
      ) {
        if (resolvedModule && checkTypeDependencies) {
          checkTypeImportDeclaredInDeps(
            resolvedModule.resolvedFileName,
            pkg,
            () => {
              const sourceFile = program.getSourceFile(
                typescript.sys.useCaseSensitiveFileNames
                  ? filename
                  : filename.toLowerCase()
              );
              return normalizePath(
                path.relative(
                  pkg.directory,
                  sourceFile ? sourceFile.fileName : filename
                )
              );
            }
          );
        }

        return imported;
      }

      depQueue.add(resolvedModule.resolvedFileName);

      let forImport = replaceExt(
        normalizePath(
          path.relative(path.dirname(filename), resolvedModule.resolvedFileName)
        )
      );
      if (!forImport.startsWith("../")) {
        forImport = `./${forImport}`;
      }
      return forImport;
    };
    const output = getDeclarationsForFile(
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
