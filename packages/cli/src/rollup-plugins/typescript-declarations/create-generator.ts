import resolveFrom from "resolve-from";
import * as fs from "fs-extra";
import path from "path";
import { FatalError } from "../../errors";
// @ts-ignore
import { createLanguageServiceHostClass } from "./language-service-host";
import normalizePath from "normalize-path";

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
  configFileName: string
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

  let LanguageServiceHostClass = createLanguageServiceHostClass(typescript);

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
  return { service, options: thing.options, program };
}

let getService = weakMemoize((typescript: Typescript) =>
  memoize(async (configFileName: string) => {
    return nonMemoizedGetService(typescript, configFileName);
  })
);

export async function createDeclarationCreator(
  dirname: string,
  pkgName: string
): Promise<{
  getDeps: (entrypoints: Array<string>) => Set<string>;
  getDeclarationFiles: (
    filename: string
  ) => Promise<{ name: string; content: string }[]>;
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
  let { service, options, program } = await (normalizePath(configFileName) ===
  normalizePath(path.join(dirname, "tsconfig.json"))
    ? nonMemoizedGetService(typescript, configFileName)
    : getService(typescript)(configFileName));
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
              typescript.sys,
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
    ): Promise<{ name: string; content: string }[]> => {
      if (filename.endsWith(".d.ts")) {
        return [
          {
            name: filename.replace(
              normalizedDirname,
              normalizePath(path.join(dirname, "dist", "declarations"))
            ),
            content: await fs.readFile(filename, "utf8"),
          },
        ];
      }
      let output = service.getEmitOutput(filename, true, true);
      return output.outputFiles.map(({ name, text }) => ({
        name: name.replace(
          normalizedDirname,
          normalizePath(path.join(dirname, "dist", "declarations"))
        ),
        content: text,
      }));
    },
  };
}
