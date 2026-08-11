import path from "path";
import realFs from "fs";
import os from "os";
import * as fs from "fs-extra";
import fastGlob from "fast-glob";
import outdent from "outdent";
import crypto from "crypto";
// import profiler from "v8-profiler-next";
import chalk from "chalk";
import { resetPromptOverrides, setPromptOverrides } from "../src/prompt";
import { confirms } from "../src/messages";

export const js = outdent;
export const ts = outdent;
export const tsx = outdent;

type FixtureEntry = string | { kind: "symlink"; path: string };
type Fixture = Readonly<Record<string, FixtureEntry>>;

const packageJson = (contents: Record<string, unknown>) =>
  JSON.stringify(contents, null, 2);

const packageSource = 'export default "something";\n';

const monorepoPackage = (name: string, value: number, main = "index.js") => ({
  "package.json": packageJson({
    name,
    main,
  }),
  "src/index.js": js`
    export default ${value};
  `,
});

export const fixtures = {
  basicPackage: {
    "package.json": packageJson({
      name: "basic-package",
      main: "index.js",
    }),
    "src/index.js": js`
      // @flow

      export default "something";
    `,
  },
  invalidFields: {
    "package.json": packageJson({
      name: "invalid-fields",
      main: "dist/index.js",
      module: "dist/index.mjs",
    }),
    "src/index.js": "",
  },
  monorepo: {
    "package.json": packageJson({
      name: "monorepo",
      main: "index.js",
      preconstruct: { packages: ["packages/*"] },
      workspaces: ["packages/*"],
    }),
    ...Object.fromEntries(
      Object.entries({
        "package-one": monorepoPackage("@some-scope/package-one", 1),
        "package-two": monorepoPackage("@some-scope/package-two", 2),
      }).flatMap(([directory, fixture]) =>
        Object.entries(fixture).map(([filename, contents]) => [
          `packages/${directory}/${filename}`,
          contents,
        ])
      )
    ),
  },
  monorepoSinglePackage: {
    "package.json": packageJson({
      name: "monorepo-single-package",
      main: "index.js",
      preconstruct: { packages: ["packages/package-two"] },
      workspaces: ["packages/*"],
    }),
    ...Object.fromEntries(
      Object.entries({
        "package-one": monorepoPackage(
          "@some-scope/package-one-single-package",
          1,
          "dist/some-scope-package-one-single-package.cjs.js"
        ),
        "package-two": monorepoPackage(
          "@some-scope/package-two-single-package",
          2,
          "dist/some-scope-package-two-single-package.cjs.js"
        ),
      }).flatMap(([directory, fixture]) =>
        Object.entries(fixture).map(([filename, contents]) => [
          `packages/${directory}/${filename}`,
          contents,
        ])
      )
    ),
  },
  noEntrypoint: {
    "package.json": packageJson({
      name: "no-entrypoint",
      main: "index.js",
    }),
  },
  noModule: {
    "package.json": packageJson({
      name: "no-module",
      main: "dist/no-module.cjs.js",
    }),
    "src/index.js": js`
      export default "this does not have a module build";
    `,
  },
  templateSimplePackage: {
    "package.json": packageJson({
      name: "template-package-json",
      main: "dist/template-package-json.cjs.js",
    }),
    "src/index.js": "",
  },
  validPackage: {
    "package.json": packageJson({
      name: "valid-package",
      main: "dist/valid-package.cjs.js",
      module: "dist/valid-package.esm.js",
      "umd:main": "dist/valid-package.umd.min.js",
      preconstruct: { umdName: "validPackage" },
    }),
    "src/index.js": packageSource,
  },
} as const;

chalk.level = 0;

type CallSpy<Arguments extends unknown[]> = ((...args: Arguments) => void) & {
  calls: Arguments[];
  reset: () => void;
};

function createCallSpy<Arguments extends unknown[]>(): CallSpy<Arguments> {
  let spy = ((...args: Arguments) => {
    spy.calls.push(args);
  }) as CallSpy<Arguments>;
  spy.calls = [];
  spy.reset = () => {
    spy.calls = [];
  };
  return spy;
}

let log = createCallSpy<any[]>();
let error = createCallSpy<any[]>();
console.log = log;
console.error = error;

export let logMock = {
  log,
  error,
};

const defaultConfirms = (Object.fromEntries(
  Object.keys(confirms).map((name) => [
    name,
    async (): Promise<boolean> => {
      throw new Error(`Confirm "${name}" was called but not stubbed`);
    },
  ])
) as unknown) as typeof confirms;

Object.assign(confirms, defaultConfirms);

export function setConfirm(
  name: keyof typeof confirms,
  value: (pkg: { readonly name: string }) => Promise<boolean>
) {
  confirms[name] = value;
}

export function setPromptInput(
  value: (
    message: string,
    pkg: { name: string },
    defaultAnswer?: string
  ) => Promise<string>
) {
  setPromptOverrides({ input: value });
}

export function stub<Arguments extends unknown[], Result>(
  implementation: (...args: Arguments) => Result
) {
  let calls: Arguments[] = [];
  let handler = (...args: Arguments) => {
    calls.push(args);
    return implementation(...args);
  };
  return { handler, calls };
}

afterEach(() => {
  logMock.log.reset();
  logMock.error.reset();
  Object.assign(confirms, defaultConfirms);
  resetPromptOverrides();
  setPromptOverrides({
    confirm: async () => undefined as any,
    input: async () => undefined as any,
  });
});

const temporaryDirectories: string[] = [];

afterAll(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) => fs.remove(directory))
  );
});

import init from "../src/init";
import normalizePath from "normalize-path";

export async function initBasic(directory: string) {
  let writeMainField = confirms.writeMainField;
  let writeModuleField = confirms.writeModuleField;
  confirms.writeMainField = async () => true;
  confirms.writeModuleField = async () => true;
  try {
    await init(directory);
  } finally {
    confirms.writeMainField = writeMainField;
    confirms.writeModuleField = writeModuleField;
  }
}

// export function profile(name: string) {
//   profiler.startProfiling(name, true);

//   return () => {
//     let profile = profiler.stopProfiling();

//     new Promise<void>((resolve) =>
//       profile
//         .export()
//         .pipe(fs.createWriteStream(name + ".cpuprofile"))
//         .on("finish", function () {
//           profile.delete();
//           resolve();
//         })
//     );
//   };
// }

function getPkgPath(tmpPath: string) {
  return path.join(tmpPath, "package.json");
}

export async function getPkg(
  filepath: string
): Promise<{ [key: string]: any }> {
  return JSON.parse(
    await fs.readFile(path.join(filepath, "package.json"), "utf-8")
  );
}

export async function modifyPkg(
  tmpPath: string,
  cb: (pkgJson: { [key: string]: any }) => unknown
) {
  let json = await getPkg(tmpPath);
  await cb(json);

  let pkgPath = getPkgPath(tmpPath);
  await fs.writeFile(pkgPath, JSON.stringify(json, null, 2));
}

export let createPackageCheckTestCreator = (
  doResult: (tmpPath: string) => Promise<void>
) => {
  let createTestCreator = (
    testFn: (testName: string, func: () => Promise<void>) => void
  ) => async (
    testName: string,
    entrypoints: { [key: string]: any },
    cb: (
      doThing: () => Promise<{ [key: string]: any }>,
      stuff: { dir: string }
    ) => Promise<void>
  ) => {
    testFn(testName, async () => {
      let tmpPath = await testdir(fixtures.templateSimplePackage);
      let things = Object.keys(entrypoints);
      await Promise.all(
        things.map(async (entrypointPath) => {
          let content = entrypoints[entrypointPath];
          let filepath = path.join(tmpPath, entrypointPath, "package.json");
          await fs.ensureFile(filepath);
          await fs.writeFile(filepath, JSON.stringify(content, null, 2));
        })
      );

      await cb(
        async () => {
          await doResult(tmpPath);

          let newThings: Record<string, any> = {};

          await Promise.all(
            things.map(async (entrypointPath) => {
              newThings[entrypointPath] = JSON.parse(
                await fs.readFile(
                  path.join(tmpPath, entrypointPath, "package.json"),
                  "utf8"
                )
              );
            })
          );
          return newThings;
        },
        { dir: tmpPath }
      );
    });
  };
  let testFn = createTestCreator(test);
  // @ts-ignore
  testFn.only = createTestCreator(test.only);
  // @ts-ignore
  testFn.skip = createTestCreator(test.skip);
  return testFn as typeof testFn & { only: typeof testFn; skip: typeof testFn };
};

function hash(content: string) {
  return crypto.createHash("md5").update(content).digest("hex");
}

export function stripHashes(...chunkNames: string[]) {
  const pattern = new RegExp(
    `(${chunkNames.join(
      "|"
    )})-[^\\.]+?(\\.(?:esm|cjs|cjs\\.(?:dev|prod))\\.js)`,
    "g"
  );
  return {
    transformPath(pathname: string, content: string) {
      return pathname.replace(pattern, (_, chunkName, ext) => {
        return `${chunkName}-this-is-not-the-real-hash-${hash(content)}${ext}`;
      });
    },
    transformContent(content: string) {
      return content.replace(pattern, (_, chunkName, ext) => {
        return `${chunkName}-some-hash${ext}`;
      });
    },
  };
}

export const repoRoot = path.resolve(__dirname, "..", "..", "..");

export const repoNodeModules = path.resolve(repoRoot, "node_modules");

export const typescriptFixture = {
  node_modules: { kind: "symlink", path: repoNodeModules },
  "package.json": JSON.stringify({
    name: "typescript",
    main: "dist/typescript.cjs.js",
    module: "dist/typescript.esm.js",
    dependencies: {
      "@types/node": "^12.7.1",
      typescript: "^3.4.5",
    },
  }),
  "tsconfig.json": `{
    "compilerOptions": {
      /* Basic Options */
      "target": "esnext" /* Specify ECMAScript target version: 'ES3' (default), 'ES5', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019' or 'ESNEXT'. */,
      "module": "commonjs" /* Specify module code generation: 'none', 'commonjs', 'amd', 'system', 'umd', 'es2015', or 'ESNext'. */,
      // "lib": [],                             /* Specify library files to be included in the compilation. */
      // "allowJs": true,                       /* Allow javascript files to be compiled. */
      // "checkJs": true,                       /* Report errors in .js files. */
      // "jsx": "preserve",                     /* Specify JSX code generation: 'preserve', 'react-native', or 'react'. */
      // "declaration": true,                   /* Generates corresponding '.d.ts' file. */
      // "declarationMap": true,                /* Generates a sourcemap for each corresponding '.d.ts' file. */
      // "sourceMap": true,                     /* Generates corresponding '.map' file. */
      // "outFile": "./",                       /* Concatenate and emit output to single file. */
      // "outDir": "./",                        /* Redirect output structure to the directory. */
      // "rootDir": "./",                       /* Specify the root directory of input files. Use to control the output directory structure with --outDir. */
      // "composite": true,                     /* Enable project compilation */
      // "incremental": true,                   /* Enable incremental compilation */
      // "tsBuildInfoFile": "./",               /* Specify file to store incremental compilation information */
      // "removeComments": true,                /* Do not emit comments to output. */
      // "noEmit": true,                        /* Do not emit outputs. */
      // "importHelpers": true,                 /* Import emit helpers from 'tslib'. */
      // "downlevelIteration": true,            /* Provide full support for iterables in 'for-of', spread, and destructuring when targeting 'ES5' or 'ES3'. */
      // "isolatedModules": true,               /* Transpile each file as a separate module (similar to 'ts.transpileModule'). */

      /* Strict Type-Checking Options */
      "strict": true /* Enable all strict type-checking options. */,
      // "noImplicitAny": true,                 /* Raise error on expressions and declarations with an implied 'any' type. */
      // "strictNullChecks": true,              /* Enable strict null checks. */
      // "strictFunctionTypes": true,           /* Enable strict checking of function types. */
      // "strictBindCallApply": true,           /* Enable strict 'bind', 'call', and 'apply' methods on functions. */
      // "strictPropertyInitialization": true,  /* Enable strict checking of property initialization in classes. */
      // "noImplicitThis": true,                /* Raise error on 'this' expressions with an implied 'any' type. */
      // "alwaysStrict": true,                  /* Parse in strict mode and emit "use strict" for each source file. */

      /* Additional Checks */
      // "noUnusedLocals": true,                /* Report errors on unused locals. */
      // "noUnusedParameters": true,            /* Report errors on unused parameters. */
      // "noImplicitReturns": true,             /* Report error when not all code paths in function return a value. */
      // "noFallthroughCasesInSwitch": true,    /* Report errors for fallthrough cases in switch statement. */

      /* Module Resolution Options */
      // "moduleResolution": "node",            /* Specify module resolution strategy: 'node' (Node.js) or 'classic' (TypeScript pre-1.6). */
      // "baseUrl": "./",                       /* Base directory to resolve non-absolute module names. */
      // "paths": {},                           /* A series of entries which re-map imports to lookup locations relative to the 'baseUrl'. */
      // "rootDirs": [],                        /* List of root folders whose combined content represents the structure of the project at runtime. */
      // "typeRoots": [],                       /* List of folders to include type definitions from. */
      // "types": [],                           /* Type declaration files to be included in compilation. */
      // "allowSyntheticDefaultImports": true,  /* Allow default imports from modules with no default export. This does not affect code emit, just typechecking. */
      "esModuleInterop": true /* Enables emit interoperability between CommonJS and ES Modules via creation of namespace objects for all imports. Implies 'allowSyntheticDefaultImports'. */,
      // "preserveSymlinks": true,              /* Do not resolve the real path of symlinks. */

      /* Source Map Options */
      // "sourceRoot": "",                      /* Specify the location where debugger should locate TypeScript files instead of source locations. */
      // "mapRoot": "",                         /* Specify the location where debugger should locate map files instead of generated locations. */
      // "inlineSourceMap": true,               /* Emit a single file with source maps instead of having a separate file. */
      // "inlineSources": true,                 /* Emit the source alongside the sourcemaps within a single file; requires '--inlineSourceMap' or '--sourceMap' to be set. */

      /* Experimental Options */
      // "experimentalDecorators": true,        /* Enables experimental support for ES7 decorators. */
      // "emitDecoratorMetadata": true,         /* Enables experimental support for emitting type metadata for decorators. */
      "noEmit": true
    }
  }`,
  ".babelrc": JSON.stringify({
    presets: [require.resolve("@babel/preset-typescript")],
  }),
  "src/index.ts": ts`
    import { SomeType } from "./another-thing";
    export * from "./one-more-thing";
    import * as path from "path";

    export { path };

    let thing: SomeType = "something";

    export default thing;
  `,
  "src/another-thing.ts": ts`
    export type SomeType = string;
  `,
  "src/one-more-thing.js": js`
    export let obj = {};
  `,
  "src/one-more-thing.d.ts": ts`
    declare var obj: object;

    export { obj };
  `,
} as const;

// basically replicating https://github.com/nodejs/node/blob/72f9c53c0f5cc03000f9a4eb1cf31f43e1d30b89/lib/fs.js#L1163-L1174
// for some reason the builtin auto-detection doesn't work, the code probably doesn't land go into that logic or something
async function getSymlinkType(targetPath: string): Promise<"dir" | "file"> {
  const stat = await fs.stat(targetPath);
  return stat.isDirectory() ? "dir" : "file";
}

export async function testdir(dir: Fixture) {
  const temp = realFs.realpathSync.native(
    realFs.mkdtempSync(path.join(os.tmpdir(), "preconstruct-"))
  );
  temporaryDirectories.push(temp);
  const fileEntries: Array<[string, string]> = [];
  const symlinkEntries: Array<[string, { kind: "symlink"; path: string }]> = [];

  for (const [filename, output] of Object.entries(dir)) {
    if (typeof output === "string") {
      fileEntries.push([filename, output]);
    } else {
      symlinkEntries.push([filename, output]);
    }
  }

  await Promise.all(
    fileEntries.map(async ([filename, output]) => {
      await fs.outputFile(path.join(temp, filename), output);
    })
  );

  await Promise.all(
    symlinkEntries.map(async ([filename, output]) => {
      const fullPath = path.join(temp, filename);
      const dir = path.dirname(fullPath);
      await fs.ensureDir(dir);
      const targetPath = path.resolve(temp, output.path);
      const symlinkType = await getSymlinkType(targetPath);
      await fs.symlink(targetPath, fullPath, symlinkType);
    })
  );
  return temp;
}

expect.addSnapshotSerializer({
  print(_val) {
    const val = _val as Record<string, string>;
    const contentsByFilename: Record<string, string[]> = {};
    Object.entries(val).forEach(([filename, contents]) => {
      if (contentsByFilename[contents] === undefined) {
        contentsByFilename[contents] = [];
      }
      contentsByFilename[contents].push(filename);
    });
    return Object.entries(contentsByFilename)
      .map(([contents, filenames]) => {
        return `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ ${filenames.join(
          ", "
        )} ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n${contents}`;
      })
      .join("\n");
  },
  test(val) {
    return val && val[dirPrintingSymbol];
  },
});

const dirPrintingSymbol = Symbol("dir printing symbol");

export async function getDist(dir: string) {
  return getFiles(dir, ["dist/**"]);
}

async function readNormalizedFile(filePath: string): Promise<string> {
  let content = await fs.readFile(filePath, "utf8");
  // to normalise windows line endings
  content = content.replace(/\r\n/g, "\n");
  if (/(?<!(\.d\.[mc]?ts))\.map$/.test(filePath)) {
    const sourceMap = JSON.parse(content);
    sourceMap.sourcesContent = sourceMap.sourcesContent.map((source: string) =>
      source.replace(/\r\n/g, "\n")
    );
    content = JSON.stringify(sourceMap);
  }
  return content;
}

export async function getFiles(
  dir: string,
  glob: string[] = ["**"],
  {
    transformContent = (x) => x,
    transformPath = (x) => x,
  }: {
    transformPath?: (path: string, contents: string) => string;
    transformContent?: (content: string) => string;
  } = {}
) {
  const files = await fastGlob(glob, {
    cwd: dir,
    ignore: ["**/node_modules/**"],
  });

  return Object.fromEntries([
    ...(
      await Promise.all(
        files.map(async (filename) => {
          let link: string | undefined;
          try {
            link = await fs.readlink(path.join(dir, filename));
          } catch (err: any) {
            if (
              err.code !== "EINVAL" &&
              // UNKNOWN is returned on Windows when it's not a symlink
              err.code !== "UNKNOWN"
            ) {
              throw err;
            }
          }
          if (link !== undefined) {
            return [
              filename,
              `⎯ symlink to ${normalizePath(
                path.relative(
                  dir,
                  path.resolve(path.dirname(path.join(dir, filename)), link)
                )
              )}`,
            ] as const;
          }
          const contents = transformContent(
            await readNormalizedFile(path.join(dir, filename))
          );
          return [transformPath(filename, contents), contents] as const;
        })
      )
    ).sort((a, b) => a[0].localeCompare(b[0])),
    [dirPrintingSymbol, true],
  ]);
}

export const basicPkgJson = (options?: {
  module?: boolean;
  dependencies?: Record<string, string>;
  umdName?: string;
}) => {
  return JSON.stringify({
    name: "pkg",
    main: "dist/pkg.cjs.js",
    module: options?.module ? "dist/pkg.esm.js" : undefined,
    ...(options?.umdName && {
      "umd:main": "dist/pkg.umd.min.js",
      preconstruct: {
        umdName: options.umdName,
      },
    }),
    dependencies: options?.dependencies,
  });
};
