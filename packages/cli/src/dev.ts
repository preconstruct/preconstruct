import { Project } from "./project";
import { success, info } from "./logger";
import {
  tsTemplate,
  flowTemplate,
  validFields,
  getNameForDist,
  mjsWrapperTemplate,
} from "./utils";
import * as babel from "@babel/core";
import * as fs from "fs-extra";
import path from "path";
import { Entrypoint } from "./entrypoint";
import { validateProject } from "./validate";
import { FatalError } from "./errors";
import resolve from "resolve";
import { errors } from "./messages";
import { stat } from "fs";

let tsExtensionPattern = /tsx?$/;

function cjsOnlyReexportTemplate(pathToSource: string) {
  return `// 👋 hey!!
// you might be reading this and seeing .esm in the filename
// and being confused why there is commonjs below this filename
// DON'T WORRY!
// this is intentional
// it's only commonjs with \`preconstruct dev\`
// when you run \`preconstruct build\`, it will be ESM
// why is it commonjs?
// we need to re-export every export from the source file
// but we can't do that with ESM without knowing what the exports are (because default exports aren't included in export/import *)
// and they could change after running \`preconstruct dev\` so we can't look at the file without forcing people to
// run preconstruct dev again which wouldn't be ideal
// this solution could change but for now, it's working

module.exports = require(${JSON.stringify(pathToSource)})
`;
}
type TypeSystemPromise = Promise<{
  system: "typescript" | "flow" | undefined;
  hasDefaultExport: () => Promise<{
    hasDefaultExport: boolean;
    ast: () => Promise<babel.types.File>;
  }>;
}>;

async function getTypeSystem(entrypoint: Entrypoint): TypeSystemPromise {
  let content = await fs.readFile(entrypoint.source, "utf8");
  let hasDefaultExport = entrypointHasDefaultExport(entrypoint, content);
  if (tsExtensionPattern.test(entrypoint.source)) {
    return {
      system: "typescript",
      hasDefaultExport,
    };
  }
  // TODO: maybe we should write the flow symlink even if there isn't an @flow
  // comment so that if someone adds an @flow comment they don't have to run preconstruct dev again
  if (content.includes("@flow")) {
    return {
      system: "flow",
      hasDefaultExport,
    };
  }
  return {
    system: undefined,
    hasDefaultExport,
  };
}

function entrypointHasDefaultExport(entrypoint: Entrypoint, content: string) {
  let getHasDefaultExport = async () => {
    let _ast: babel.types.File;
    let getAST = async () => {
      if (!_ast) {
        _ast = (await babel.parseAsync(content, {
          filename: entrypoint.source,
          sourceType: "module",
          cwd: entrypoint.package.project.directory,
        }))! as babel.types.File;
      }
      return _ast;
    };
    // this regex won't tell us that a module definitely has a default export
    // if it doesn't match though, it will tell us that the module
    // definitely _doesn't_ have a default export
    // we want to do this because a Babel parse is very expensive
    // so we want to avoid doing it unless we absolutely have to
    if (
      !/(export\s*{[^}]*default|export\s+(|\*\s+as\s+)default\s)/.test(content)
    ) {
      return { hasDefaultExport: false, ast: getAST };
    }

    for (let statement of (await getAST()).program.body) {
      if (
        statement.type === "ExportDefaultDeclaration" ||
        (statement.type === "ExportNamedDeclaration" &&
          statement.specifiers.some(
            (specifier) =>
              (specifier.type === "ExportDefaultSpecifier" ||
                specifier.type === "ExportNamespaceSpecifier" ||
                specifier.type === "ExportSpecifier") &&
              specifier.exported.name === "default"
          ))
      ) {
        return { hasDefaultExport: true, ast: getAST };
      }
    }
    return { hasDefaultExport: false, ast: getAST };
  };
  let promise: Promise<{
    hasDefaultExport: boolean;
    ast: () => Promise<babel.types.File>;
  }>;
  return () => {
    if (promise === undefined) {
      promise = getHasDefaultExport();
    }
    return promise;
  };
}

export async function writeDevTSFile(
  entrypoint: Entrypoint,
  hasDefaultExport: boolean
) {
  let cjsDistPath = path
    .join(entrypoint.directory, validFields.main(entrypoint))
    .replace(/\.js$/, "");

  await fs.outputFile(
    cjsDistPath + ".d.ts",
    `// are you seeing an error that a default export doesn't exist but your source file has a default export?
// you should run \`yarn\` or \`yarn preconstruct dev\` if preconstruct dev isn't in your postinstall hook

// curious why you need to?
// this file exists so that you can import from the entrypoint normally
// except that it points to your source file and you don't need to run build constantly
// which means we need to re-export all of the modules from your source file
// and since export * doesn't include default exports, we need to read your source file
// to check for a default export and re-export it if it exists
// it's not ideal, but it works pretty well ¯\\_(ツ)_/¯
` +
      tsTemplate(
        hasDefaultExport,
        path
          .relative(path.dirname(cjsDistPath), entrypoint.source)
          .replace(/\.tsx?$/, "")
      )
  );
}

async function writeTypeSystemFile(
  typeSystemPromise: TypeSystemPromise,
  entrypoint: Entrypoint
) {
  let { hasDefaultExport, system } = await typeSystemPromise;
  if (system === undefined) return;
  let cjsDistPath = path.join(
    entrypoint.directory,
    validFields.main(entrypoint)
  );

  if (system === "flow") {
    // so...
    // you might have noticed that this passes
    // hasExportDefault=false
    // and be thinking that default exports
    // but flow seems to be
    // then you might ask, if re-exporting the default
    // export isn't necessary, why do it for actual builds?
    // the reason is is that if preconstruct dev breaks because
    // of a new version of flow that changes this, that's mostly okay
    // because preconstruct dev can be fixed, a consumer can upgrade it
    // and then everything is fine but if a production build is broken
    // a consumer would have to do a new release and that's not ideal
    await fs.writeFile(
      cjsDistPath + ".flow",
      flowTemplate(
        false,
        path.relative(path.dirname(cjsDistPath), entrypoint.source)
      )
    );
  }
  if (system === "typescript") {
    await writeDevTSFile(
      entrypoint,
      (await hasDefaultExport()).hasDefaultExport
    );
  }
}

function promiseThing<Result>(): Promise<Result> & {
  resolve(result: Result): void;
  reject(error: any): void;
} {
  let resolve;
  let reject;
  let promise: any = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}
function waitUntilDoneTimes(n: number): Promise<void> & { add: () => void } {
  let current = 0;
  let promise = Object.assign(promiseThing<void>(), {
    add() {
      current += 1;
      if (current === n) {
        promise.resolve();
      }
    },
  });
  return promise;
}

export default async function dev(projectDir: string) {
  let project = await Project.create(projectDir);
  validateProject(project);
  info("project is valid!");

  let promises: Promise<unknown>[] = [];
  const nodeESMIsEnabled = project.experimentalFlags.nodeESM;
  await Promise.all(
    project.packages.map((pkg) => {
      const depGraph: DepGraph = {};
      const depGraphFinishedPromise = waitUntilDoneTimes(
        pkg.entrypoints.length
      );
      return Promise.all(
        pkg.entrypoints.map(async (entrypoint) => {
          let typeSystemPromise = getTypeSystem(entrypoint);
          let distDirectory = path.join(entrypoint.directory, "dist");
          if (nodeESMIsEnabled) {
            depGraph[entrypoint.source] = {
              exportNames: new Set(),
              exportStarDeps: new Set(),
            };
          }
          await fs.remove(distDirectory);
          await fs.ensureDir(distDirectory);

          let promises = [
            writeTypeSystemFile(typeSystemPromise, entrypoint),
            fs.writeFile(
              path.join(entrypoint.directory, validFields.main(entrypoint)),
              `"use strict";
// this file might look strange and you might be wondering what it's for
// it's lets you import your source files by importing this entrypoint
// as you would import it if it was built with preconstruct build
// this file is slightly different to some others though
// it has a require hook which compiles your code with Babel
// this means that you don't have to set up @babel/register or anything like that
// but you can still require this module and it'll be compiled

const path = require("path");

// this bit of code imports the require hook and registers it
let unregister = require(${JSON.stringify(
                path.relative(
                  distDirectory,
                  require.resolve("@preconstruct/hook")
                )
              )}).___internalHook(path.resolve(__dirname, ${JSON.stringify(
                path.relative(distDirectory, project.directory)
              )}), path.resolve(__dirname, ${JSON.stringify(
                path.relative(distDirectory, pkg.directory)
              )}));

// this re-exports the source file
module.exports = require(${JSON.stringify(
                path.relative(distDirectory, entrypoint.source)
              )});

// this unregisters the require hook so that any modules required after this one
// aren't compiled with the require hook in case you have some other require hook
// or something that should be used on other modules
unregister();
`
            ),
          ];
          if (entrypoint.json.module) {
            promises.push(
              fs.writeFile(
                path.join(entrypoint.directory, validFields.module(entrypoint)),
                cjsOnlyReexportTemplate(
                  path.relative(distDirectory, entrypoint.source)
                )
              )
            );
          }
          if (entrypoint.json.browser) {
            let browserField = validFields.browser(entrypoint);
            for (let key of Object.keys(browserField)) {
              promises.push(
                fs.writeFile(
                  path.join(entrypoint.directory, browserField[key]),
                  cjsOnlyReexportTemplate(
                    path.relative(distDirectory, entrypoint.source)
                  )
                )
              );
            }
          }

          if (nodeESMIsEnabled) {
            promises.push(
              typeSystemPromise
                .then(({ hasDefaultExport }) => {
                  return hasDefaultExport();
                })
                .then(({ ast }) => ast())
                .then(async (ast) => {
                  await resolveDependency(
                    entrypoint.source,
                    ast,
                    project.directory,
                    depGraph,
                    depGraph[entrypoint.source]
                  );
                  depGraphFinishedPromise.add();
                  await depGraphFinishedPromise;
                  const exportNames = resolveExportNamesForModuleInGraph(
                    depGraph,
                    entrypoint.source
                  );
                  debugger;
                  return fs.writeFile(
                    path.join(
                      entrypoint.directory,
                      `dist/${getNameForDist(pkg.name)}.mjs`
                    ),
                    mjsWrapperTemplate(
                      exportNames,
                      `./${path.basename(validFields.main(entrypoint))}`
                    )
                  );
                })
            );
          }

          return Promise.all(promises);
        })
      );
    })
  );

  await Promise.all(promises);

  success("created links!");
}

type Dep = { exportStarDeps: Set<string>; exportNames: Set<string> };

type DepGraph = Record<string, Dep>;

function resolveExportNamesForModuleInGraph(
  depGraph: DepGraph,
  filename: string
) {
  let modulesVisited = new Set<string>();
  let exportedNames = new Set<string>();
  let queue = [filename];
  while (queue.length) {
    const currentFilename = queue.shift()!;
    if (modulesVisited.has(currentFilename)) {
      continue;
    }
    modulesVisited.add(currentFilename);
    const currentMod = depGraph[currentFilename];
    for (const exportName of currentMod.exportNames) {
      exportedNames.add(exportName);
    }
    queue.push(...currentMod.exportStarDeps);
  }
  return exportedNames;
}

// note that we're not being smart about not exporting types because they won't really cause problems
async function resolveDependency(
  filename: string,
  ast: babel.types.File,
  cwd: string,
  depGraph: DepGraph,
  mod: Dep
) {
  await Promise.all(
    ast.program.body.map(async (statement) => {
      if (statement.type === "ExportDefaultDeclaration") {
        mod.exportNames.add("default");
      }

      if (
        statement.type === "ExportNamedDeclaration" &&
        statement.exportKind === "value"
      ) {
        for (const specifier of statement.specifiers) {
          mod.exportNames.add(specifier.exported.name);
        }
        if (statement.declaration) {
          for (const exportName of Object.keys(
            babel.types.getOuterBindingIdentifiers(statement.declaration)
          )) {
            mod.exportNames.add(exportName);
          }
        }
      }
      if (statement.type === "ExportAllDeclaration") {
        if (/^\.\.?\/?/.test(statement.source.value)) {
          const depFilename = resolve.sync(statement.source.value, {
            basedir: path.dirname(filename),
            preserveSymlinks: false,
          });
          mod.exportStarDeps.add(depFilename);
          if (depGraph[depFilename] !== undefined) return;
          const dep: Dep = {
            exportNames: new Set(),
            exportStarDeps: new Set(),
          };
          depGraph[depFilename] = dep;
          const file = (await babel.parseAsync(
            await fs.readFile(depFilename, "utf8"),
            {
              filename: depFilename,
              sourceType: "module",
              cwd,
            }
          ))! as babel.types.File;
          await resolveDependency(depFilename, file, cwd, depGraph, dep);
        } else {
          throw new FatalError(
            errors.noExportStarFromExternalWhenUsingNodeESM,
            path.relative(cwd, filename)
          );
        }
      }
    })
  );
}
