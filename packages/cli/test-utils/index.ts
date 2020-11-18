import path from "path";
import * as fs from "fs-extra";
import fastGlob from "fast-glob";
import fixturez from "fixturez";
import spawn from "spawndamnit";
import outdent from "outdent";
import crypto from "crypto";
// import profiler from "v8-profiler-next";
import chalk from "chalk";

let f = fixturez(__dirname);

export const js = outdent;
export const ts = outdent;
export const tsx = outdent;

chalk.level = 0;

console.error = jest.fn();
console.log = jest.fn();
export let logMock = {
  log: (console.log as any) as jest.MockInstance<void, any>,
  error: (console.error as any) as jest.MockInstance<void, any>,
};

afterEach(() => {
  logMock.log.mockReset();
  logMock.error.mockReset();
});

import init from "../src/init";
import { confirms } from "../src/messages";

let mockedConfirms = confirms as jest.Mocked<typeof confirms>;

export async function initBasic(directory: string) {
  mockedConfirms.writeMainField.mockReturnValue(Promise.resolve(true));
  mockedConfirms.writeModuleField.mockReturnValue(Promise.resolve(true));

  await init(directory);
  mockedConfirms.writeMainField.mockReset();
  mockedConfirms.writeModuleField.mockReset();
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
      let tmpPath = f.copy("template-simple-package");
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

export async function snapshotDistFiles(tmpPath: string) {
  let distPath = path.join(tmpPath, "dist");
  let distFiles;
  try {
    distFiles = await fs.readdir(distPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(distPath + " does not exist");
    }
    throw err;
  }

  await Promise.all(
    distFiles.map(async (x) => {
      expect(
        await fs.readFile(path.join(distPath, x), "utf-8")
      ).toMatchSnapshot(x);
    })
  );
}

function hash(content: string) {
  return crypto.createHash("md5").update(content).digest("hex");
}

export let stripHashes = async (chunkName: string) => {
  let transformer = (pathname: string, content: string) => {
    return pathname.replace(new RegExp(`${chunkName}-[^\\.]+`, "g"), () => {
      return `chunk-this-is-not-the-real-hash-${hash(content)}`;
    });
  };
  return {
    transformPath: transformer,
    transformContent: (content: string) => {
      return content.replace(new RegExp(`${chunkName}-[^\\.]+`, "g"), () => {
        return "chunk-some-hash";
      });
    },
  };
};

export async function snapshotDirectory(
  tmpPath: string,
  {
    files = "js",
    filterPath = (x) => true,
    transformPath = (x) => x,
    transformContent = (x) => x,
  }: {
    files?: "all" | "js";
    filterPath?: (path: string) => boolean;
    transformPath?: (path: string, contents: string) => string;
    transformContent?: (content: string) => string;
  } = {}
) {
  let paths = await fastGlob(
    [`**/${files === "js" ? "*.js" : "*"}`, "!node_modules/**", "!yarn.lock"],
    {
      cwd: tmpPath,
    }
  );

  await Promise.all(
    paths
      .filter((fp) => filterPath(fp))
      .map(async (x) => {
        let content = transformContent(
          await fs.readFile(path.join(tmpPath, x), "utf-8")
        );
        if (x.endsWith(".json") && !x.endsWith("tsconfig.json")) {
          content = JSON.parse(content);
        }
        expect(content).toMatchSnapshot(transformPath(x, content));
      })
  );
}

export async function install(tmpPath: string) {
  await spawn("yarn", ["install"], { cwd: tmpPath });
}

export const repoNodeModules = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "node_modules"
);

export const typescriptFixture: Fixture = {
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
};

type Fixture = {
  [key: string]: string | { kind: "symlink"; path: string };
};

export async function testdir(dir: {
  [key: string]: string | { kind: "symlink"; path: string };
}) {
  const temp = f.temp();
  await Promise.all(
    Object.keys(dir).map(async (filename) => {
      const output = dir[filename];
      const fullPath = path.join(temp, filename);
      if (typeof output === "string") {
        await fs.outputFile(fullPath, dir[filename]);
      } else {
        const dir = path.dirname(fullPath);
        await fs.ensureDir(dir);
        await fs.symlink(path.resolve(temp, output.path), fullPath);
      }
    })
  );
  return temp;
}

expect.addSnapshotSerializer({
  print(val: Record<string, string>, serialize, indent) {
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

export async function getFiles(dir: string, glob: string[] = ["**"]) {
  const files = await fastGlob(glob, { cwd: dir });
  const filesObj: Record<string, string> = {
    [dirPrintingSymbol]: true,
  };
  await Promise.all(
    files.map(async (filename) => {
      filesObj[filename] = await fs.readFile(path.join(dir, filename), "utf8");
    })
  );
  let newObj: Record<string, string> = { [dirPrintingSymbol]: true };
  files.sort().forEach((filename) => {
    newObj[filename] = filesObj[filename];
  });
  return newObj;
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
