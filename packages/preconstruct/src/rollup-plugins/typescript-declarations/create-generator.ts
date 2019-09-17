// @flow
import resolveFrom from "resolve-from";
import * as fs from "fs-extra";
import path from "path";
import { createLanguageServiceHostClass } from "./language-service-host";

let unsafeRequire = require;

let weakMemoize = function<Arg, Return>(func: Arg => Return): Arg => Return {
  // $FlowFixMe flow doesn't include all non-primitive types as allowed for weakmaps
  let cache: WeakMap<Arg, Return> = new WeakMap();
  return arg => {
    if (cache.has(arg)) {
      // $FlowFixMe
      return cache.get(arg);
    }
    let ret = func(arg);
    cache.set(arg, ret);
    return ret;
  };
};

function memoize<V>(fn: string => V): string => V {
  const cache = {};

  return (arg: string) => {
    if (cache[arg] === undefined) cache[arg] = fn(arg);
    return cache[arg];
  };
}

let getService = weakMemoize(typescript =>
  memoize(async configFileName => {
    let configFileContents = await fs.readFile(configFileName, "utf8");
    const result = typescript.parseConfigFileTextToJson(
      configFileName,
      configFileContents
    );

    let thing = typescript.parseJsonConfigFileContent(
      result,
      typescript.sys,
      process.cwd(),
      undefined,
      configFileName
    );

    let LanguageServiceHostClass = createLanguageServiceHostClass(typescript);

    let servicesHost = new LanguageServiceHostClass(thing, []);

    let service = typescript.createLanguageService(
      servicesHost,
      typescript.createDocumentRegistry()
    );
    servicesHost.setLanguageService(service);
    return { service, options: thing.options };
  })
);

export async function createDeclarationCreator(
  dirname: string
): Promise<{
  getDeps: (entrypoints: Array<string>) => Set<string>,
  getDeclarationFile: (
    filename: string
  ) => Promise<{ name: string, content: string }>
}> {
  let typescript;
  try {
    typescript = unsafeRequire(resolveFrom(dirname, "typescript"));
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      throw new Error(
        "an entrypoint source file ends with the .ts or .tsx extension but the typescript module could not be resolved from the project directory, please install it."
      );
    }
    throw err;
  }
  let configFileName = typescript.findConfigFile(
    dirname,
    typescript.sys.fileExists
  );
  if (!configFileName) {
    throw new Error(
      "an entrypoint source file ends with the .ts extension but no TypeScript config exists, please create one."
    );
  }
  let { service, options } = await getService(typescript)(configFileName);
  let moduleResolutionCache = typescript.createModuleResolutionCache(
    dirname,
    x => x,
    options
  );

  return {
    getDeps: (entrypoints: Array<string>) => {
      let program = service.getProgram();
      if (!program) {
        throw new Error(
          "This is an internal error, please open an issue if you see this: program not found"
        );
      }
      let resolvedEntrypointPaths = entrypoints.map(x => {
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
          let sourceFile = program.getSourceFile(dep);
          if (!sourceFile) {
            throw new Error(
              "This is an internal error, please open an issue if you see this: source file not found"
            );
          }
          let internalDeps = new Set();
          for (let { text } of sourceFile.imports) {
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
                resolvedModule.resolvedFileName.includes(dirname)
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
    getDeclarationFile: async (
      filename: string
    ): Promise<{ name: string, content: string }> => {
      if (filename.endsWith(".d.ts")) {
        return {
          name: filename.replace(
            dirname,
            path.join(dirname, "dist", "declarations")
          ),
          content: await fs.readFile(filename, "utf8")
        };
      }
      let output = service.getEmitOutput(filename, true);
      return {
        name: output.outputFiles[0].name.replace(
          dirname,
          path.join(dirname, "dist", "declarations")
        ),
        content: output.outputFiles[0].text
      };
    }
  };
}
