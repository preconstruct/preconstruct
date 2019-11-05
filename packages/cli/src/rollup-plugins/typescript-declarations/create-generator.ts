import resolveFrom from "resolve-from";
import * as fs from "fs-extra";
import path from "path";
// @ts-ignore
import { createLanguageServiceHostClass } from "./language-service-host";
import { Project } from "../../project";
import { Package } from "../../package";

type Typescript = typeof import("typescript");

let unsafeRequire = require;

let weakMemoize = function<Arg extends object, Return>(
  func: (arg: Arg) => Return
): (arg: Arg) => Return {
  let cache: WeakMap<Arg, Return> = new WeakMap();
  return arg => {
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

let getService = weakMemoize((typescript: Typescript) =>
  weakMemoize((project: Project) =>
    memoize(async (configFileName: string) => {
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
      // thing.options.paths = {
      //   ...thing.options.paths
      // };
      // for (let pkg of project.packages) {
      //   for (let entrypoint of pkg.entrypoints) {
      //     thing.options.paths[entrypoint.name] = [
      //       path.join(
      //         pkg.name,
      //         path.relative(entrypoint.directory, entrypoint.source)
      //       )
      //     ];
      //   }
      // }
      // debugger;
      thing.options.declaration = true;
      thing.options.noEmit = false;

      let LanguageServiceHostClass = createLanguageServiceHostClass(typescript);

      let servicesHost = new LanguageServiceHostClass(thing, [], project);

      let service = typescript.createLanguageService(
        servicesHost,
        typescript.createDocumentRegistry()
      );
      servicesHost.setLanguageService(service);
      return { service, options: thing.options };
    })
  )
);

export async function createDeclarationCreator(
  pkg: Package
): Promise<{
  getDeps: (entrypoints: Array<string>) => Set<string>;
  getDeclarationFile: (
    filename: string
  ) => Promise<{ name: string; content: string }>;
}> {
  let typescript: Typescript;
  try {
    typescript = unsafeRequire(resolveFrom(pkg.directory, "typescript"));
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      throw new Error(
        "an entrypoint source file ends with the .ts or .tsx extension but the typescript module could not be resolved from the project directory, please install it."
      );
    }
    throw err;
  }
  let configFileName = typescript.findConfigFile(
    pkg.directory,
    typescript.sys.fileExists
  );
  if (!configFileName) {
    throw new Error(
      "an entrypoint source file ends with the .ts extension but no TypeScript config exists, please create one."
    );
  }
  let { service, options } = await getService(typescript)(pkg.project)(
    configFileName
  );
  let moduleResolutionCache = typescript.createModuleResolutionCache(
    pkg.directory,
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
          pkg.directory,
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
            throw new Error(
              "This is an internal error, please open an issue if you see this: source file not found"
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
                resolvedModule.resolvedFileName.includes(pkg.directory)
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
    ): Promise<{ name: string; content: string }> => {
      if (filename.endsWith(".d.ts")) {
        return {
          name: filename.replace(
            pkg.directory,
            path.join(pkg.directory, "dist", "declarations")
          ),
          content: await fs.readFile(filename, "utf8")
        };
      }
      let output = service.getEmitOutput(filename, true);
      return {
        name: output.outputFiles[0].name.replace(
          pkg.directory,
          path.join(pkg.directory, "dist", "declarations")
        ),
        content: output.outputFiles[0].text
      };
    }
  };
}
