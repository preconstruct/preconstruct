import normalizePath from "normalize-path";
import path from "path";
import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  TS,
} from "./common";
import { Program, ResolvedModuleFull } from "typescript";
import { getModuleSpecifier } from "./get-module-specifier";

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

  function replaceDescendentNode<Parent extends import("typescript").Node>(
    root: Parent,
    oldNode: import("typescript").Node,
    newNode: import("typescript").Node,
    context: import("typescript").TransformationContext
  ): Parent {
    const visitor = (
      node: import("typescript").Node
    ): import("typescript").Node => {
      if (node === oldNode) return newNode;
      return typescript.visitEachChild(node, visitor, context);
    };
    return typescript.visitEachChild(root, visitor, context);
  }
  for (const filename of depQueue) {
    const importReplacements = new Map<string, string | false>();
    const handleImport = <Parent extends import("typescript").Node>(
      parent: Parent,
      moduleSpecifier: import("typescript").StringLiteral,
      context: import("typescript").TransformationContext
    ): Parent => {
      const imported = moduleSpecifier.text;
      if (importReplacements.has(imported)) {
        const replacedImportPath = importReplacements.get(imported)!;
        if (replacedImportPath === false) return parent;
        const newStringLiteral = typescript.factory.createStringLiteral(
          replacedImportPath
        );
        return replaceDescendentNode(
          parent,
          moduleSpecifier,
          newStringLiteral,
          context
        );
      }
      const resolvedModule = resolveModuleName(imported, filename);
      if (
        !resolvedModule ||
        !resolvedModule.resolvedFileName.startsWith(normalizedPkgDir) ||
        resolvedModule.resolvedFileName.startsWith(normalizedPkgDirNodeModules)
      ) {
        importReplacements.set(imported, false);
        return parent;
      }
      depQueue.add(resolvedModule.resolvedFileName);
      if (imported[0] !== "#") {
        importReplacements.set(imported, false);
        return parent;
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
      const newStringLiteral = typescript.factory.createStringLiteral(
        forImport
      );
      return replaceDescendentNode(
        parent,
        moduleSpecifier,
        newStringLiteral,
        context
      );
    };
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
          (context) => (
            node
          ): import("typescript").Bundle | import("typescript").SourceFile => {
            // typescript has a exportedModulesFromDeclarationEmit property
            // on these source files, it's marked @internal though so i'm not using it
            // might want to detect at runtime if it exists and use it in that case otherwise defer to this
            // i'm not terribly worried though
            // you should not have massive declarations files in the way that having massive source
            // files is actually reasonable
            const visitor = <TNode extends import("typescript").Node>(
              node: TNode
            ): TNode => {
              const literal = getModuleSpecifier(node, typescript);
              if (literal) return handleImport(node, literal, context);
              return typescript.visitEachChild(node, visitor, context);
            };
            return typescript.visitEachChild(node, visitor, context);
          },
        ],
      }
    );
    emitted.push(output);
  }
  return emitted;
}
