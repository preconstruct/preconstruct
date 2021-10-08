import path from "path";
import normalizePath from "normalize-path";
import {
  EmittedDeclarationOutput,
  getDeclarationsForFile,
  getDiagnosticsHost,
  getProgram,
  loadTypeScript,
} from "./common";

export async function getDeclarationsReachableFromEntrypoints(
  dirname: string,
  pkgName: string,
  projectDir: string,
  entrypoints: string[]
): Promise<EmittedDeclarationOutput[]> {
  const typescript = loadTypeScript(dirname, pkgName);

  const { program, options } = await getProgram(dirname, pkgName, typescript);
  let moduleResolutionCache = typescript.createModuleResolutionCache(
    dirname,
    (x) => x,
    options
  );
  let normalizedDirname = normalizePath(dirname);

  let resolvedEntrypointPaths = entrypoints.map((x) => {
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
    return resolvedModule.resolvedFileName;
  });
  const diagnosticsHost = getDiagnosticsHost(typescript, projectDir);

  const depQueue = new Set<string>(resolvedEntrypointPaths);

  const emitted: EmittedDeclarationOutput[] = [];

  for (const filename of depQueue) {
    // this is mostly sync except for one bit so running this concurrently wouldn't really help
    const output = await getDeclarationsForFile(
      filename,
      typescript,
      program,
      normalizedDirname,
      projectDir,
      diagnosticsHost
    );
    emitted.push(output);
    const { importedFiles } = typescript.preProcessFile(output.types.content);
    for (const importedFile of importedFiles) {
      let { resolvedModule } = typescript.resolveModuleName(
        importedFile.fileName,
        filename,
        options,
        typescript.sys,
        moduleResolutionCache
      );
      if (
        resolvedModule &&
        !resolvedModule.isExternalLibraryImport &&
        resolvedModule.resolvedFileName.includes(normalizedDirname)
      ) {
        depQueue.add(resolvedModule.resolvedFileName);
      }
    }
  }
  return emitted;
}
