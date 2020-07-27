import * as fs from "fs-extra";
import path from "path";
import type { SourceFile } from "ts-morph";
import resolveFrom from "resolve-from";
import { FatalError } from "../../errors";

type TSM = typeof import("ts-morph");

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

let getProject = weakMemoize((tsm: TSM) =>
  memoize((configFileName: string) => {
    return new tsm.Project({
      tsConfigFilePath: configFileName,
      compilerOptions: {
        noEmit: false,
        declaration: true,
      },
    });
  })
);

export async function createDeclarationCreatorWithTSMorph(
  dirname: string,
  pkgName: string
): Promise<{
  getDeps: (entrypoints: Array<string>) => Set<string>;
  getDeclarationFile: (
    filename: string
  ) => Promise<{ name: string; content: string }>;
}> {
  let tsm: TSM;
  try {
    tsm = require(resolveFrom(dirname, "ts-morph"));
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      throw new FatalError(
        "an entrypoint source file ends with the .ts or .tsx extension and the experimental `useTSMorphToGenerateTSDeclarations` flag is on but the ts-morph module could not be resolved from the project directory, please install it.",
        pkgName
      );
    }
    throw err;
  }

  let filesToBuild = new Set();

  let queue: SourceFile[] = [];

  while (queue.length) {
    let sourceFile = queue.shift()!;
    if (filesToBuild.has(sourceFile)) continue;
    for (const dependency of sourceFile.getReferencedSourceFiles()) {
      dependency.getFilePath();
    }

    filesToBuild.add(sourceFile);
  }
  let configFileName = tsm.ts.findConfigFile(dirname, tsm.ts.sys.fileExists);
  if (!configFileName) {
    throw new FatalError(
      "an entrypoint source file ends with the .ts or .tsx extension but no TypeScript config exists, please create one.",
      pkgName
    );
  }
  let project = getProject(tsm)(configFileName);

  return {
    getDeps: (entrypoints: Array<string>) => {
      let allDeps = new Set<string>();

      let queue = [...entrypoints];

      while (queue.length) {
        let sourceFilePath = queue.shift()!;
        if (allDeps.has(sourceFilePath)) {
          continue;
        }
        let sourceFile = project.getSourceFileOrThrow(sourceFilePath);
        allDeps.add(sourceFilePath);
        let sourceFiles = sourceFile.getReferencedSourceFiles();
        queue.push(...sourceFiles.map((x) => x.getFilePath()));
      }

      return allDeps;
    },
    getDeclarationFile: async (
      filename: string
    ): Promise<{ name: string; content: string }> => {
      if (filename.endsWith(".d.ts")) {
        return {
          name: filename.replace(
            dirname,
            path.join(dirname, "dist", "declarations")
          ),
          content: await fs.readFile(filename, "utf8"),
        };
      }
      let output = project
        .getSourceFileOrThrow(filename)
        .getEmitOutput({ emitOnlyDtsFiles: true });

      let outputFiles = output.getOutputFiles();
      return {
        name: outputFiles[0]
          .getFilePath()
          .replace(dirname, path.join(dirname, "dist", "declarations")),
        content: outputFiles[0].getText(),
      };
    },
  };
}
