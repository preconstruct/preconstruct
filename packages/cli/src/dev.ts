import { lazyRequire } from "lazy-require.macro";
import { Project } from "./project";
import { success, info } from "./logger";
import {
  dtsTemplate,
  flowTemplate,
  validFieldsForEntrypoint,
  getExportsFieldOutputPath,
  tsReexportDeclMap,
  getExportsImportUnwrappingDefaultOutputPath,
  dmtsTemplate,
  mjsTemplate,
  getBaseDistFilename,
  getJsDefaultForMjsFilepath,
  jsDefaultForMjsTemplate,
  dtsDefaultForDmtsTemplate,
  getDtsDefaultForMtsFilepath,
  getDistFilenameForConditions,
} from "./utils";
import * as fs from "fs-extra";
import path from "path";
import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import { validateProject } from "./validate";

let tsExtensionPattern = /\.tsx?$/;

async function hasDtsFile(entrypoint: Entrypoint) {
  try {
    const filename = entrypoint.source.replace(/\.jsx?/, ".d.ts");
    await fs.stat(filename);
    return true;
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return false;
}

// technically we should consider three states 'no-default' | 'default' | 'type-only-default'
// but we don't handle that correctly for builds right now anyway and i don't think people are
// really doing type-only default exports so i'm not worrying about it right now
export async function entrypointHasDefaultExport(
  entrypoint: Entrypoint,
  content: string
) {
  // this regex won't tell us that a module definitely has a default export
  // if it doesn't match though, it will tell us that the module
  // definitely _doesn't_ have a default export
  // we want to do this because a Babel parse is very expensive
  // so we want to avoid doing it unless we absolutely have to
  if (
    !/(export\s*{[^}]*default|export\s+(|\*\s+as\s+)default\s)/.test(content)
  ) {
    return false;
  }
  const babel = lazyRequire<typeof import("@babel/core")>();
  let ast = (await babel.parseAsync(content, {
    filename: entrypoint.source,
    sourceType: "module",
    cwd: entrypoint.package.project.directory,
  }))! as babel.types.File;

  for (let statement of ast.program.body) {
    if (
      statement.type === "ExportDefaultDeclaration" ||
      (statement.type === "ExportNamedDeclaration" &&
        statement.specifiers.some(
          (specifier) =>
            (specifier.type === "ExportDefaultSpecifier" ||
              specifier.type === "ExportNamespaceSpecifier" ||
              specifier.type === "ExportSpecifier") &&
            specifier.exported.type === "Identifier" &&
            specifier.exported.name === "default"
        ))
    ) {
      return true;
    }
  }
  return false;
}

export async function writeDevTSFiles(
  entrypoint: Entrypoint,
  hasDefaultExport: boolean
) {
  const dtsReexportFilename = path
    .join(entrypoint.directory, validFieldsForEntrypoint.main(entrypoint))
    .replace(/\.js$/, ".d.ts");

  const baseDtsFilename = path.basename(dtsReexportFilename);
  const relativePathWithExtension = normalizePath(
    path.relative(path.dirname(dtsReexportFilename), entrypoint.source)
  );

  let promises: Promise<unknown>[] = [
    fs.outputFile(
      dtsReexportFilename,
      dtsTemplate(
        baseDtsFilename,
        hasDefaultExport,
        relativePathWithExtension.replace(/\.tsx?$/, "")
      )
    ),
    fs.outputFile(
      dtsReexportFilename + ".map",
      tsReexportDeclMap(baseDtsFilename, relativePathWithExtension)
    ),
  ];

  if (
    entrypoint.package.exportsFieldConfig()?.importConditionDefaultExport ===
    "default"
  ) {
    const dmtsReexportFilename = path
      .join(
        entrypoint.package.directory,
        getExportsImportUnwrappingDefaultOutputPath(entrypoint)
      )
      .replace(/\.mjs$/, ".d.mts");
    const baseDmtsFilename = path.basename(dmtsReexportFilename);

    const ext = path.extname(relativePathWithExtension).slice(1);
    const mappedExt = { ts: "js", tsx: "js", mts: "mjs", cts: "cjs" }[ext];
    const pathToImport = relativePathWithExtension.replace(
      new RegExp(`\\.${ext}$`),
      `.${mappedExt}`
    );
    promises.push(
      fs.outputFile(
        dmtsReexportFilename,
        dmtsTemplate(baseDmtsFilename, hasDefaultExport, pathToImport)
      ),
      fs.outputFile(
        dmtsReexportFilename + ".map",
        tsReexportDeclMap(baseDmtsFilename, relativePathWithExtension)
      )
    );
    if (hasDefaultExport) {
      promises.push(
        fs.outputFile(
          getDtsDefaultForMtsFilepath(dmtsReexportFilename),
          dtsDefaultForDmtsTemplate(pathToImport)
        )
      );
    }
  }

  await Promise.all(promises);
}

async function writeDevFlowFile(entrypoint: Entrypoint) {
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
  let cjsDistPath = path.join(
    entrypoint.directory,
    validFieldsForEntrypoint.main(entrypoint)
  );
  await fs.writeFile(
    cjsDistPath + ".flow",
    flowTemplate(
      false,
      normalizePath(path.relative(path.dirname(cjsDistPath), entrypoint.source))
    )
  );
}

export default async function dev(projectDir: string) {
  let project = await Project.create(projectDir);
  validateProject(project);
  info("project is valid!");

  await Promise.all(
    project.packages.map((pkg) => {
      const exportsFieldConfig = pkg.exportsFieldConfig();

      return Promise.all(
        pkg.entrypoints.map(async (entrypoint) => {
          let hasDefaultExportPromise: Promise<boolean> | undefined;
          const contentsPromise = fs.readFile(entrypoint.source, "utf8");
          const getHasDefaultExportPromise = () => {
            if (hasDefaultExportPromise === undefined) {
              hasDefaultExportPromise = contentsPromise.then((content) =>
                entrypointHasDefaultExport(entrypoint, content)
              );
            }
            return hasDefaultExportPromise;
          };
          await cleanEntrypoint(entrypoint);
          let entrypointPromises: Promise<unknown>[] = [
            (async () => {
              if ((await contentsPromise).includes("@flow")) {
                await writeDevFlowFile(entrypoint);
              }
            })(),
            (async () => {
              if (
                tsExtensionPattern.test(entrypoint.source) ||
                (await hasDtsFile(entrypoint))
              ) {
                await writeDevTSFiles(
                  entrypoint,
                  await getHasDefaultExportPromise()
                );
              }
            })(),
          ];
          const cjsTemplate = commonjsRequireHookTemplate(entrypoint);
          if (exportsFieldConfig?.conditions.kind === "imports") {
            for (const conditions of exportsFieldConfig.conditions.groups.keys()) {
              entrypointPromises.push(
                fs.symlink(
                  entrypoint.source,
                  path.join(
                    entrypoint.directory,
                    getDistFilenameForConditions(
                      entrypoint,
                      conditions.concat("module")
                    )
                  )
                ),
                fs.writeFile(
                  path.join(
                    entrypoint.directory,
                    getDistFilenameForConditions(entrypoint, conditions)
                  ),
                  cjsTemplate
                )
              );
              if (
                exportsFieldConfig.importConditionDefaultExport === "default"
              ) {
                entrypointPromises.push(
                  getHasDefaultExportPromise().then((hasDefaultExport) => {
                    const filepath = path.join(
                      entrypoint.package.directory,
                      getDistFilenameForConditions(
                        entrypoint,
                        conditions
                      ).replace(/\.js$/, ".mjs")
                    );
                    const importPath = `./${getDistFilenameForConditions(
                      entrypoint,
                      conditions
                    )}`;
                    return Promise.all([
                      fs.writeFile(
                        filepath,
                        mjsTemplate(
                          // the * won't really do anything right now
                          // since cjs-module-lexer won't find anything
                          // but that could be fixed by adding fake things
                          // to the .cjs.js file that look like exports to cjs-module-lexer
                          // but don't actually add the exports at runtime like esbuild does
                          // (it would require re-running dev when adding new named exports)
                          hasDefaultExport ? ["default", "*other"] : ["*other"],
                          importPath,
                          filepath
                        )
                      ),
                      hasDefaultExport &&
                        fs.writeFile(
                          getJsDefaultForMjsFilepath(filepath),
                          jsDefaultForMjsTemplate(importPath)
                        ),
                    ]);
                  })
                );
              }
            }
            return Promise.all(entrypointPromises);
          }
          entrypointPromises.push(
            fs.writeFile(
              path.join(
                entrypoint.directory,
                validFieldsForEntrypoint.main(entrypoint)
              ),
              cjsTemplate
            )
          );
          if (exportsFieldConfig?.importConditionDefaultExport === "default") {
            entrypointPromises.push(
              getHasDefaultExportPromise().then((hasDefaultExport) => {
                const filepath = path.join(
                  entrypoint.package.directory,
                  getExportsImportUnwrappingDefaultOutputPath(entrypoint)
                );
                const importPath = `./${getBaseDistFilename(
                  entrypoint,
                  "cjs"
                )}`;
                return Promise.all([
                  fs.writeFile(
                    filepath,
                    mjsTemplate(
                      // the * won't really do anything right now
                      // since cjs-module-lexer won't find anything
                      // but that could be fixed by adding fake things
                      // to the .cjs.js file that look like exports to cjs-module-lexer
                      // but don't actually add the exports at runtime like esbuild does
                      // (it would require re-running dev when adding new named exports)
                      hasDefaultExport ? ["default", "*other"] : ["*other"],
                      importPath,
                      filepath
                    )
                  ),
                  hasDefaultExport
                    ? fs.writeFile(
                        getJsDefaultForMjsFilepath(filepath),
                        jsDefaultForMjsTemplate(importPath)
                      )
                    : undefined,
                ]);
              })
            );
          }
          if (entrypoint.json.module) {
            entrypointPromises.push(
              fs.symlink(
                entrypoint.source,
                path.join(
                  entrypoint.directory,
                  validFieldsForEntrypoint.module(entrypoint)
                )
              )
            );
          }

          if (exportsFieldConfig?.conditions.envs.has("worker")) {
            entrypointPromises.push(
              fs.symlink(
                entrypoint.source,
                path.join(
                  pkg.directory,
                  getExportsFieldOutputPath(entrypoint, "worker")
                )
              )
            );
          }

          if (entrypoint.json.browser) {
            let browserField = validFieldsForEntrypoint.browser(entrypoint);
            for (let output of Object.values(browserField)) {
              entrypointPromises.push(
                fs.symlink(
                  entrypoint.source,
                  path.join(entrypoint.directory, output)
                )
              );
            }
          }

          return Promise.all(entrypointPromises);
        })
      );
    })
  );

  success("created links!");
}

async function cleanEntrypoint(entrypoint: Entrypoint) {
  let distDirectory = path.join(entrypoint.directory, "dist");

  await fs.remove(distDirectory);
  await fs.ensureDir(distDirectory);
}

function commonjsRequireHookTemplate(entrypoint: Entrypoint) {
  const distDirectory = path.join(entrypoint.directory, "dist");
  let entrypointPath = normalizePath(
    path.relative(distDirectory, entrypoint.source)
  );
  return `"use strict";
// this file might look strange and you might be wondering what it's for
// it's lets you import your source files by importing this entrypoint
// as you would import it if it was built with preconstruct build
// this file is slightly different to some others though
// it has a require hook which compiles your code with Babel
// this means that you don't have to set up @babel/register or anything like that
// but you can still require this module and it'll be compiled

// this bit of code imports the require hook and registers it
let unregister = require(${JSON.stringify(
    normalizePath(
      path.relative(
        distDirectory,
        path.dirname(require.resolve("@preconstruct/hook"))
      )
    )
  )}).___internalHook(typeof __dirname === 'undefined' ? undefined : __dirname, ${JSON.stringify(
    normalizePath(
      path.relative(distDirectory, entrypoint.package.project.directory)
    )
  )}, ${JSON.stringify(
    normalizePath(path.relative(distDirectory, entrypoint.directory))
  )});

// this re-exports the source file
module.exports = require(${JSON.stringify(entrypointPath)});

unregister();
`;
}
