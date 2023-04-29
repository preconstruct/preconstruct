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
} from "./utils";
import * as babel from "@babel/core";
import * as fs from "fs-extra";
import path from "path";
import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import { validateProject } from "./validate";

let tsExtensionPattern = /tsx?$/;

type TypeSystemInfo = {
  flow: boolean;
  typescript: false | { contents: string; filename: string };
};

async function getTypeSystem(entrypoint: Entrypoint): Promise<TypeSystemInfo> {
  let sourceContents = await fs.readFile(entrypoint.source, "utf8");
  const ret: TypeSystemInfo = {
    flow: false,
    typescript: false,
  };
  if (tsExtensionPattern.test(entrypoint.source)) {
    ret.typescript = { contents: sourceContents, filename: entrypoint.source };
  } else {
    try {
      const filename = entrypoint.source.replace(/\.jsx?/, ".d.ts");
      let tsSourceContents = await fs.readFile(filename, "utf8");
      ret.typescript = { contents: tsSourceContents, filename };
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }
  if (sourceContents.includes("@flow")) {
    ret.flow = true;
  }
  return ret;
}

export async function entrypointHasDefaultExport(
  entrypoint: Entrypoint,
  content: string,
  filename: string
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
  let ast = (await babel.parseAsync(content, {
    filename,
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
    entrypoint.package.exportsFieldConfig()?.importDefaultExport ===
    "unwrapped-default"
  ) {
    const dmtsReexportFilename = path
      .join(
        entrypoint.package.directory,
        getExportsImportUnwrappingDefaultOutputPath(entrypoint)
      )
      .replace(/\.mjs$/, ".d.mts");
    const baseDmtsFilename = path.basename(dmtsReexportFilename);

    const ext = path.extname(relativePathWithExtension).slice(1);
    const mappedExt = { ts: "js", mts: "mjs", cts: "cjs" }[ext];

    promises.push(
      fs.outputFile(
        dmtsReexportFilename,
        dmtsTemplate(
          baseDmtsFilename,
          hasDefaultExport,
          relativePathWithExtension.replace(
            new RegExp(`\\.${ext}$`),
            `.${mappedExt}`
          )
        )
      ),
      fs.outputFile(
        dmtsReexportFilename + ".map",
        tsReexportDeclMap(baseDmtsFilename, relativePathWithExtension)
      )
    );
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
      return Promise.all(
        pkg.entrypoints.map(async (entrypoint) => {
          let hasDefaultExportPromise: Promise<boolean> | undefined;
          let typeSystemPromise = getTypeSystem(entrypoint);

          let distDirectory = path.join(entrypoint.directory, "dist");
          let entrypointPath = normalizePath(
            path.relative(distDirectory, entrypoint.source)
          );

          await fs.remove(distDirectory);
          await fs.ensureDir(distDirectory);

          let entrypointPromises: Promise<unknown>[] = [
            typeSystemPromise.then((typeSystemInfo) => {
              let typeSystemPromises = [];
              if (typeSystemInfo.flow) {
                typeSystemPromises.push(writeDevFlowFile(entrypoint));
              }
              if (typeSystemInfo.typescript !== false) {
                hasDefaultExportPromise ??= entrypointHasDefaultExport(
                  entrypoint,
                  typeSystemInfo.typescript.contents,
                  typeSystemInfo.typescript.filename
                );

                typeSystemPromises.push(
                  hasDefaultExportPromise.then((hasDefaultExport) =>
                    writeDevTSFiles(entrypoint, hasDefaultExport)
                  )
                );
              }
              return Promise.all(typeSystemPromises);
            }),
            fs.writeFile(
              path.join(
                entrypoint.directory,
                validFieldsForEntrypoint.main(entrypoint)
              ),
              `"use strict";
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
                normalizePath(path.relative(distDirectory, project.directory))
              )}, ${JSON.stringify(
                normalizePath(path.relative(distDirectory, pkg.directory))
              )});

// this re-exports the source file
module.exports = require(${JSON.stringify(entrypointPath)});

unregister();
`
            ),
          ];
          if (
            pkg.exportsFieldConfig()?.importDefaultExport ===
            "unwrapped-default"
          ) {
            hasDefaultExportPromise ??= entrypointHasDefaultExport(
              entrypoint,
              await fs.readFile(entrypoint.source, "utf8"),
              entrypoint.source
            );
            entrypointPromises.push(
              hasDefaultExportPromise.then((hasDefaultExport) =>
                fs.writeFile(
                  path.join(
                    entrypoint.package.directory,
                    getExportsImportUnwrappingDefaultOutputPath(entrypoint)
                  ),
                  mjsTemplate(
                    // the * won't really do anything right now
                    // since cjs-module-lexer won't find anything
                    // but that could be fixed by adding fake things
                    // to the .cjs.js file that look like exports to cjs-module-lexer
                    // but don't actually add the exports at runtime like esbuild does
                    // (it would require re-running dev when adding new named exports)
                    hasDefaultExport ? ["default", "*other"] : ["*other"],
                    entrypointPath
                  )
                )
              )
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

          if (pkg.exportsFieldConfig()?.envConditions?.has("worker")) {
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
