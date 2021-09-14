import resolveFrom from "resolve-from";
import * as fs from "fs-extra";
import path from "path";
import { FatalError } from "../../errors";
import normalizePath from "normalize-path";
import { EOL } from "os";

type DeclarationFile = {
  name: string;
  content: string;
};

type EmittedDeclarationOutput = {
  /** The emitted d.ts types file. */
  types: DeclarationFile;
  /** The emitted d.ts.map declaration map file. */
  map?: DeclarationFile;
};

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

async function nonMemoizedGetProgram(
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
  thing.options.emitDeclarationOnly = true;
  thing.options.noEmit = false;

  let program = typescript.createProgram(thing.fileNames, thing.options);
  return { options: thing.options, program };
}

let getProgram = weakMemoize((typescript: Typescript) =>
  memoize(async (configFileName: string) => {
    return nonMemoizedGetProgram(typescript, configFileName);
  })
);

export async function createDeclarationCreator(
  dirname: string,
  pkgName: string,
  projectDir: string
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
  let { options, program } = await (normalizePath(configFileName) ===
  normalizePath(path.join(dirname, "tsconfig.json"))
    ? nonMemoizedGetProgram(typescript, configFileName)
    : getProgram(typescript)(configFileName));
  let moduleResolutionCache = typescript.createModuleResolutionCache(
    dirname,
    (x) => x,
    options
  );
  let normalizedDirname = normalizePath(dirname);

  const diagnosticsHost: import("typescript").FormatDiagnosticsHost = {
    getCanonicalFileName: (x) =>
      typescript.sys.useCaseSensitiveFileNames ? x : x.toLowerCase(),
    getCurrentDirectory: () => projectDir,
    getNewLine: () => EOL,
  };

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
                resolvedModule.resolvedFileName.includes(normalizedDirname) &&
                // you can import a .json file if you have resolveJsonModule: true in your tsconfig
                // but you can't generate declarations for it(which seems fine and good i think?)
                // and just ignoring imports to them seems fine because from what i can tell
                // typescript inlines the types for them if the json file import is used in the files exports
                !resolvedModule.resolvedFileName.endsWith(".json")
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

      const sourceFile = program.getSourceFile(
        typescript.sys.useCaseSensitiveFileNames
          ? filename
          : filename.toLowerCase()
      );
      if (!sourceFile) {
        throw new Error(
          `Could not find source file at ${filename} in TypeScript declaration generation, this is likely a bug in Preconstruct`
        );
      }
      const emitted: Partial<EmittedDeclarationOutput> = {};
      const otherEmitted: { name: string; text: string }[] = [];
      const { diagnostics } = program.emit(
        sourceFile,
        (name, text) => {
          if (name.endsWith(".d.ts")) {
            emitted.types = {
              name: name.replace(
                normalizedDirname,
                normalizePath(path.join(dirname, "dist", "declarations"))
              ),
              content: text,
            };
          } else if (name.endsWith(".d.ts.map")) {
            emitted.map = {
              name: name.replace(
                normalizedDirname,
                normalizePath(path.join(dirname, "dist", "declarations"))
              ),
              content: text,
            };
          } else {
            otherEmitted.push({ name, text });
          }
        },
        undefined,
        true
      );

      if (!emitted.types || diagnostics.length) {
        throw new FatalError(
          `Generating TypeScript declarations for ${normalizePath(
            path.relative(projectDir, filename)
          )} failed:\n${typescript.formatDiagnosticsWithColorAndContext(
            diagnostics,
            diagnosticsHost
          )}${
            otherEmitted.length
              ? `\n\nTypeScript emitted other files when attempting to emit .d.ts files:\n${otherEmitted
                  .map((x) => `${x.name}\n\n${x.text}`)
                  .join("\n\n")}`
              : ""
          }`,
          ""
        );
      }
      return { types: emitted.types, map: emitted.map };
    },
  };
}
