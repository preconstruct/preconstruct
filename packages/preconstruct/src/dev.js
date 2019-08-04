// @flow
import { Project } from "./project";
import { success, info } from "./logger";
import { tsTemplate } from "./utils";
import * as babel from "@babel/core";
import * as fs from "fs-extra";
import path from "path";

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
  entrypoint
): Promise<[null | "flow" | "typescript", string]> {
  let content = await fs.readFile(entrypoint.source, "utf8");

  if (tsExtensionPattern.test(entrypoint.source)) {
    return ["typescript", content];
  }
  // TODO: maybe we should write the flow symlink even if there isn't an @flow
  // comment so that if someone adds an @flow comment they don't have to run preconstruct dev again
  if (content.includes("@flow")) {
    return ["flow", content];
  }
  return [null, content];
}

async function writeFlowFile(typeSystemPromise, entrypoint) {
  let [typeSystem, content] = await typeSystemPromise;
  if (typeSystem === null) return;
  let cjsDistPath = path.join(entrypoint.directory, entrypoint.main);

  if (typeSystem === "flow") {
    await fs.symlink(entrypoint.source, cjsDistPath + ".flow");
  }
  if (typeSystem === "typescript") {
    let ast = await babel.parseAsync(content, {
      filename: entrypoint.source,
      sourceType: "module",
      cwd: entrypoint.package.project.directory
    });

    let hasDefaultExport = false;

    for (let statement of ast.program.body) {
      if (
        statement.type === "ExportDefaultDeclaration" ||
        (statement.type === "ExportNamedDeclaration" &&
          statement.specifiers.some(
            specifier =>
              specifier.type === "ExportSpecifier" &&
              specifier.exported.name === "default"
          ))
      ) {
        hasDefaultExport = true;
        break;
      }
    }
    await fs.writeFile(
      cjsDistPath + ".ts",
      tsTemplate(
        hasDefaultExport,
        path
          .relative(path.dirname(cjsDistPath), entrypoint.source)
          .replace(/\.tsx?$/, "")
      )
    );
  }
}

export default async function dev(projectDir: string) {
  let project: Project = await Project.create(projectDir);
  project.packages.forEach(({ entrypoints }) =>
    entrypoints.forEach(x => x.strict())
  );
  info("project is valid!");

  let promises = [];
  await Promise.all(
    project.packages.map(pkg => {
      return Promise.all(
        pkg.entrypoints.map(async _entrypoint => {
          let entrypoint = _entrypoint.strict();
          let typeSystemPromise = getTypeSystem(entrypoint);

          await fs.remove(path.join(entrypoint.directory, "dist"));
          await fs.ensureDir(path.join(entrypoint.directory, "dist"));

          let promises = [
            writeFlowFile(typeSystemPromise, entrypoint),
            fs.writeFile(
              path.join(entrypoint.directory, entrypoint.main),
              `"use strict";

let unregister = require(${JSON.stringify(
                require.resolve("@preconstruct/hook")
              )}).___internalHook(${JSON.stringify(project.directory)});

module.exports = require(${JSON.stringify(entrypoint.source)});

unregister();
`
            )
          ];
          if (entrypoint.module) {
            promises.push(
              fs.writeFile(
                path.join(entrypoint.directory, entrypoint.module),
                cjsOnlyReexportTemplate(entrypoint.source)
              )
            );
          }
          let browserField = entrypoint.browser;
          if (browserField) {
            for (let key of Object.keys(browserField)) {
              promises.push(
                fs.writeFile(
                  path.join(entrypoint.directory, browserField[key]),
                  cjsOnlyReexportTemplate(entrypoint.source)
                )
              );
            }
          }
          let rnField = entrypoint.reactNative;
          if (rnField) {
            for (let key of Object.keys(rnField)) {
              promises.push(
                fs.writeFile(
                  path.join(entrypoint.directory, rnField[key]),
                  cjsOnlyReexportTemplate(entrypoint.source)
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
