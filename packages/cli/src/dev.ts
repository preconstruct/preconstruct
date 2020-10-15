import { Project } from "./project";
import { success, info } from "./logger";
import { tsTemplate, flowTemplate, validFields } from "./utils";
import * as babel from "@babel/core";
import * as fs from "fs-extra";
import path from "path";
import { Entrypoint } from "./entrypoint";
import { validateProject } from "./validate";

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

async function getTypeSystem(
  entrypoint: Entrypoint
): Promise<[undefined | "flow" | "typescript", string]> {
  let content = await fs.readFile(entrypoint.source, "utf8");

  if (tsExtensionPattern.test(entrypoint.source)) {
    return ["typescript", content];
  }
  // TODO: maybe we should write the flow symlink even if there isn't an @flow
  // comment so that if someone adds an @flow comment they don't have to run preconstruct dev again
  if (content.includes("@flow")) {
    return ["flow", content];
  }
  return [undefined, content];
}

async function entrypointHasDefaultExport(
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
            specifier.exported.name === "default"
        ))
    ) {
      return true;
    }
  }
  return false;
}

export async function writeDevTSFile(
  entrypoint: Entrypoint,
  entrypointSourceContent: string
) {
  let hasDefaultExport = await entrypointHasDefaultExport(
    entrypoint,
    entrypointSourceContent
  );
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
  typeSystemPromise: Promise<[undefined | "flow" | "typescript", string]>,
  entrypoint: Entrypoint
) {
  let [typeSystem, content] = await typeSystemPromise;
  if (typeSystem === undefined) return;
  let cjsDistPath = path.join(
    entrypoint.directory,
    validFields.main(entrypoint)
  );

  if (typeSystem === "flow") {
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
  if (typeSystem === "typescript") {
    await writeDevTSFile(entrypoint, content);
  }
}

export default async function dev(projectDir: string) {
  let project = await Project.create(projectDir);
  validateProject(project);
  info("project is valid!");

  let promises: Promise<unknown>[] = [];
  await Promise.all(
    project.packages.map((pkg) => {
      return Promise.all(
        pkg.entrypoints.map(async (entrypoint) => {
          let typeSystemPromise = getTypeSystem(entrypoint);

          let distDirectory = path.join(entrypoint.directory, "dist");

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

// this bit of code imports the require hook and registers it
require(${JSON.stringify(
                path.relative(
                  distDirectory,
                  path.dirname(require.resolve("@preconstruct/hook"))
                )
              )}).___internalHook(typeof __dirname === 'undefined' ? undefined : __dirname, ${JSON.stringify(
                path.relative(distDirectory, project.directory)
              )}, ${JSON.stringify(
                path.relative(distDirectory, pkg.directory)
              )});

// this re-exports the source file
module.exports = require(${JSON.stringify(
                path.relative(distDirectory, entrypoint.source)
              )});
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

          return Promise.all(promises);
        })
      );
    })
  );

  await Promise.all(promises);

  success("created links!");
}
