import resolveFrom from "resolve-from";
import * as fs from "fs-extra";
import path from "path";
import { FatalError } from "../../errors";
// @ts-ignore
import { createLanguageServiceHostClass } from "./language-service-host";
import normalizePath from "normalize-path";
import { Project } from "../../project";
import { Diagnostic, ModuleResolutionHost } from "typescript";

interface DeclarationFile {
  name: string;
  content: string;
}

interface EmittedDeclarationOutput {
  /** The emitted d.ts types file. */
  types: DeclarationFile;
  /** The emitted d.ts.map declaration map file. */
  map?: DeclarationFile;
}

type Typescript = typeof import("typescript");

let unsafeRequire = require;

let weakMemoize = function <Arg extends object, Return>(
  func: (arg: Arg) => Return
): (arg: Arg) => Return {
  let cache: WeakMap<Arg, Return> = new WeakMap();
  return (arg) => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    let ret = func(arg);
    cache.set(arg, ret);
    return ret;
  };
};

function memoize<V>(fn: (arg: string) => V): (arg: string) => V {
  const cache: { [key: string]: V } = {};

  return (arg: string) => {
    if (cache[arg] === undefined) cache[arg] = fn(arg);
    return cache[arg];
  };
}

async function nonMemoizedGetService(
  typescript: Typescript,
  configFileName: string,
  project: Project
) {
  let configFileContents = await fs.readFile(configFileName, "utf8");
  const result = typescript.parseConfigFileTextToJson(
    configFileName,
    configFileContents
  );

  let thing = typescript.parseJsonConfigFileContent(
    result.config,
    typescript.sys,
    process.cwd(),
    undefined,
    configFileName
  );
  thing.options.declaration = true;
  thing.options.noEmit = false;

  const distDirsToRoot = new Map<string, string>();

  for (const pkg of project.packages) {
    const distDeclDir = normalizePath(
      path.join(pkg.directory, "dist", "declarations")
    );
    distDirsToRoot.set(distDeclDir, pkg.directory);
  }

  type PathReplacement =
    | {
        kind: "none";
        path: string;
      }
    | {
        kind: "replaced";
        path: string;
        originalSection: string;
        replacedSection: string;
      };

  let replacePath = (pathname: string): PathReplacement => {
    // this is purely an optimisation, this should not affect correctness
    if (!pathname.includes("dist")) {
      return { kind: "none", path: pathname };
    }
    const normalized = normalizePath(pathname);
    let currentPath = normalized;
    let iterations = 0;
    while (true) {
      const root = distDirsToRoot.get(currentPath);
      if (root !== undefined) {
        return {
          kind: "replaced",
          path: normalized.replace(currentPath, root),
          originalSection: currentPath,
          replacedSection: root,
        };
      }
      const dirOfPath = normalizePath(path.dirname(currentPath));
      if (currentPath === dirOfPath) {
        return { kind: "none", path: pathname };
      }
      if (iterations === 100) {
        throw new Error("over 100 iterations in while true thing");
      }
      iterations++;
      currentPath = dirOfPath;
    }
  };

  let LanguageServiceHostClass = createLanguageServiceHostClass(
    typescript,
    (x) => replacePath(x).path
  );

  let servicesHost = new LanguageServiceHostClass(thing, []);

  let service = typescript.createLanguageService(
    servicesHost,
    typescript.createDocumentRegistry()
  );
  servicesHost.setLanguageService(service);
  let program = service.getProgram();
  if (!program) {
    throw new Error(
      "This is an internal error, please open an issue if you see this: program not found"
    );
  }
  let diagnostics: Diagnostic[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    diagnostics.push(...program.getSemanticDiagnostics(sourceFile));
  }

  console.log(
    typescript.formatDiagnostics(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (x) => x,
      getNewLine: () => "\n",
    })
  );

  const realpath = typescript.sys.realpath;
  const moduleResolutionHost: ModuleResolutionHost = {
    fileExists(filename) {
      return typescript.sys.fileExists(replacePath(filename).path);
    },
    readFile(filename) {
      return typescript.sys.readFile(replacePath(filename).path);
    },
    directoryExists(dirpath) {
      return typescript.sys.directoryExists(replacePath(dirpath).path);
    },
    getCurrentDirectory: typescript.sys.getCurrentDirectory,
    realpath: realpath
      ? (filename) => {
          const replaced = replacePath(filename);
          let real = realpath(replaced.path);
          if (replaced.kind === "replaced") {
            return normalizePath(real).replace(
              replaced.originalSection,
              replaced.replacedSection
            );
          }
          return real;
        }
      : undefined,
  };
  return { service, options: thing.options, program, moduleResolutionHost };
}

let getService = weakMemoize((project: Project) =>
  weakMemoize((typescript: Typescript) =>
    memoize(async (configFileName: string) => {
      return nonMemoizedGetService(typescript, configFileName, project);
    })
  )
);

export async function createDeclarationCreator(
  dirname: string,
  pkgName: string,
  project: Project
): Promise<{
  getDeps: (entrypoints: Array<string>) => Set<string>;
  getDeclarationFiles: (filename: string) => Promise<EmittedDeclarationOutput>;
}> {
  let typescript: Typescript;
  try {
    typescript = unsafeRequire(resolveFrom(dirname, "typescript"));
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      throw new FatalError(
        "an entrypoint source file ends with the .ts or .tsx extension but the typescript module could not be resolved from the project directory, please install it.",
        pkgName
      );
    }
    throw err;
  }
  let configFileName = typescript.findConfigFile(
    dirname,
    typescript.sys.fileExists
  );
  if (!configFileName) {
    throw new FatalError(
      "an entrypoint source file ends with the .ts or tsx extension but no TypeScript config exists, please create one.",
      pkgName
    );
  }
  // if the tsconfig is inside the package directory, let's not memoize getting the ts service
  // since it'll only ever be used once
  // and if we keep it, we could run out of memory for large projects
  // if the tsconfig _isn't_ in the package directory though, it's probably fine to memoize it
  // since it should just be a root level tsconfig
  let {
    service,
    options,
    program,
    moduleResolutionHost,
  } = await (normalizePath(configFileName) ===
  normalizePath(path.join(dirname, "tsconfig.json"))
    ? nonMemoizedGetService(typescript, configFileName, project)
    : getService(project)(typescript)(configFileName));
  let moduleResolutionCache = typescript.createModuleResolutionCache(
    dirname,
    (x) => x,
    options
  );

  let normalizedDirname = normalizePath(dirname);

  return {
    getDeps: (entrypoints: Array<string>) => {
      let resolvedEntrypointPaths = entrypoints.map((x) => {
        let { resolvedModule } = typescript.resolveModuleName(
          path.join(path.dirname(x), path.basename(x, path.extname(x))),
          dirname,
          options,
          moduleResolutionHost,
          moduleResolutionCache
        );
        if (!resolvedModule) {
          throw new Error(
            "This is an internal error, please open an issue if you see this: ts could not resolve module"
          );
        }
        return resolvedModule.resolvedFileName;
      });
      let allDeps = new Set<string>(resolvedEntrypointPaths);

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
              moduleResolutionHost,
              moduleResolutionCache
            );
            if (resolvedModule) {
              if (
                !allDeps.has(resolvedModule.resolvedFileName) &&
                !resolvedModule.isExternalLibraryImport &&
                resolvedModule.resolvedFileName.includes(normalizedDirname)
              ) {
                internalDeps.add(resolvedModule.resolvedFileName);
                allDeps.add(resolvedModule.resolvedFileName);
              }
            }
          }
          searchDeps(internalDeps);
        }
      }
      searchDeps(new Set(resolvedEntrypointPaths));
      return allDeps;
    },
    getDeclarationFiles: async (
      filename: string
    ): Promise<EmittedDeclarationOutput> => {
      if (filename.endsWith(".d.ts")) {
        return {
          types: {
            name: filename.replace(
              normalizedDirname,
              normalizePath(path.join(dirname, "dist", "declarations"))
            ),
            content: await fs.readFile(filename, "utf8"),
          },
        };
      }
      let output = service.getEmitOutput(filename, true, true);
      return output.outputFiles.reduce((emitted, { name, text }) => {
        if (name.endsWith(".d.ts")) {
          emitted.types = {
            name: name.replace(
              normalizedDirname,
              normalizePath(path.join(dirname, "dist", "declarations"))
            ),
            content: text,
          };
        }

        if (name.endsWith(".d.ts.map")) {
          emitted.map = {
            name: name.replace(
              normalizedDirname,
              normalizePath(path.join(dirname, "dist", "declarations"))
            ),
            content: text,
          };
        }

        return emitted;
      }, {} as EmittedDeclarationOutput);
    },
  };
}
