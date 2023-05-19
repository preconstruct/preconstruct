import { EOL } from "os";
import resolveFrom from "resolve-from";
import { FatalError } from "../../errors";
import * as fs from "fs-extra";
import path from "path";
import normalizePath from "normalize-path";
import { getModuleSpecifier } from "./get-module-specifier";
import MagicString from "magic-string";

export type DeclarationFile = {
  name: string;
  content: string;
};

export type EmittedDeclarationOutput = {
  /** The emitted d.ts types file. */
  types: DeclarationFile;
  /** The emitted d.ts.map declaration map file. */
  map?: DeclarationFile;
  /** The input TypeScript file */
  filename: string;
};

export type TS = typeof import("typescript");

export function getDiagnosticsHost(
  ts: TS,
  projectDir: string
): import("typescript").FormatDiagnosticsHost {
  return {
    getCanonicalFileName: (x) =>
      ts.sys.useCaseSensitiveFileNames ? x : x.toLowerCase(),
    getCurrentDirectory: () => projectDir,
    getNewLine: () => EOL,
  };
}

export function loadTypeScript(
  packageDir: string,
  projectDir: string,
  pkgName: string
): TS {
  try {
    return require(resolveFrom(packageDir, "typescript"));
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      try {
        // if people have typescript installed at the their project and they're using Yarn PnP,
        // typescript won't be resolvable at the package level but it will be resolvable at the project level
        // (note this will only happen with PnP)
        return require(resolveFrom(projectDir, "typescript"));
      } catch (err) {
        throw new FatalError(
          "an entrypoint source file ends with the .ts or .tsx extension but the typescript module could not be resolved from the project directory, please install it.",
          pkgName
        );
      }
    }
    throw err;
  }
}

function weakMemoize<Arg extends object, Return>(
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
}

function memoize<V>(fn: (arg: string) => V): (arg: string) => V {
  const cache = new Map<string, V>();
  return (arg: string) => {
    if (!cache.has(arg)) cache.set(arg, fn(arg));
    return cache.get(arg)!;
  };
}

async function nonMemoizedGetProgram(typescript: TS, configFileName: string) {
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

  thing.options.outDir = undefined;
  thing.options.declarationDir = undefined;
  thing.options.declaration = true;
  thing.options.emitDeclarationOnly = true;
  thing.options.noEmit = false;

  let program = typescript.createProgram(thing.fileNames, thing.options);
  return { options: thing.options, program };
}

let memoizedGetProgram = weakMemoize((typescript: TS) =>
  memoize(async (configFileName: string) => {
    return nonMemoizedGetProgram(typescript, configFileName);
  })
);

export async function getProgram(dirname: string, pkgName: string, ts: TS) {
  let configFileName = ts.findConfigFile(dirname, ts.sys.fileExists);
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
  return normalizePath(configFileName) ===
    normalizePath(path.join(dirname, "tsconfig.json"))
    ? nonMemoizedGetProgram(ts, configFileName)
    : memoizedGetProgram(ts)(configFileName);
}

export function getDeclarationsForFile(
  filename: string,
  typescript: TS,
  program: import("typescript").Program,
  normalizedPkgDir: string,
  projectDir: string,
  diagnosticsHost: import("typescript").FormatDiagnosticsHost,
  /** This will only be called once per unique module specifier in a file */
  visitModuleSpecifier?: (moduleSpecifier: string) => string
): EmittedDeclarationOutput {
  const cachedVisitModuleSpecifier = memoize(
    visitModuleSpecifier ?? ((x) => x)
  );
  const sourceFile = program.getSourceFile(
    typescript.sys.useCaseSensitiveFileNames ? filename : filename.toLowerCase()
  );
  if (!sourceFile) {
    throw new Error(
      `Could not find source file at ${filename} in TypeScript declaration generation, this is likely a bug in Preconstruct`
    );
  }
  if (filename.endsWith(".d.ts")) {
    let content = sourceFile.text;
    if (visitModuleSpecifier) {
      const magicString = new MagicString(content);
      const visitor = (node: import("typescript").Node): void => {
        const moduleSpecifier = getModuleSpecifier(node, typescript);
        if (moduleSpecifier) {
          const replaced = cachedVisitModuleSpecifier(moduleSpecifier.text);
          if (replaced !== moduleSpecifier.text) {
            magicString.update(
              moduleSpecifier.getStart(sourceFile, false),
              moduleSpecifier.getEnd(),
              JSON.stringify(replaced)
            );
          }
        }
        typescript.forEachChild(node, visitor);
      };
      typescript.forEachChild(sourceFile, visitor);
      content = magicString.toString();
    }
    return {
      types: {
        name: filename.replace(
          normalizedPkgDir,
          normalizePath(path.join(normalizedPkgDir, "dist", "declarations"))
        ),
        content,
      },
      filename,
    };
  }

  const emitted: Partial<EmittedDeclarationOutput> = {};
  const otherEmitted: { name: string; text: string }[] = [];
  const { diagnostics } = program.emit(
    sourceFile,
    (name, text) => {
      if (name.endsWith(".d.ts")) {
        emitted.types = {
          name: name.replace(
            normalizedPkgDir,
            normalizePath(path.join(normalizedPkgDir, "dist", "declarations"))
          ),
          content: text,
        };
      } else if (name.endsWith(".d.ts.map")) {
        emitted.map = {
          name: name.replace(
            normalizedPkgDir,
            normalizePath(path.join(normalizedPkgDir, "dist", "declarations"))
          ),
          content: text,
        };
      } else {
        otherEmitted.push({ name, text });
      }
    },
    undefined,
    true,
    {
      afterDeclarations: [
        (context) => (
          node
        ): import("typescript").Bundle | import("typescript").SourceFile => {
          if (!visitModuleSpecifier) {
            return node;
          }

          const replacedNodes = new Map<
            import("typescript").StringLiteral,
            import("typescript").StringLiteral
          >();

          const visitor = (
            node: import("typescript").Node
          ): import("typescript").Node => {
            if (typescript.isStringLiteral(node) && replacedNodes.has(node)) {
              return replacedNodes.get(node)!;
            }
            const literal = getModuleSpecifier(node, typescript);
            if (literal) {
              const replaced = cachedVisitModuleSpecifier(literal.text);
              if (replaced !== literal.text) {
                replacedNodes.set(
                  literal,
                  typescript.factory.createStringLiteral(replaced)
                );
              }
            }
            return typescript.visitEachChild(node, visitor, context);
          };
          return typescript.visitEachChild(node, visitor, context);
        },
      ],
    }
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
  return { types: emitted.types, map: emitted.map, filename };
}

export function overwriteDeclarationMapSourceRoot(
  content: string,
  actualSourceRoot: string
): string {
  const src = JSON.parse(content);
  src.sourceRoot = actualSourceRoot;
  return JSON.stringify(src);
}
