// @flow
import { Project } from "./project";
import { success, info } from "./logger";
import * as fs from "fs-extra";
import * as babel from "@babel/core";
import { flowTemplate } from "./utils";
import path from "path";

async function writeFlowFile(contentPromise, entrypoint) {
  let content = await contentPromise;
  if (!content.includes("@flow")) {
    return;
  }
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

  let cjsDistPath = path.join(entrypoint.directory, entrypoint.main);
  let relativePath = path.relative(
    path.dirname(cjsDistPath),
    entrypoint.source
  );
  let contents = flowTemplate(hasDefaultExport, relativePath);
  await fs.writeFile(cjsDistPath + ".flow", contents);
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
          let contentPromise = fs.readFile(entrypoint.source, "utf8");
          await fs.remove(path.join(entrypoint.directory, "dist"));
          await fs.ensureDir(path.join(entrypoint.directory, "dist"));

          let promises = [
            writeFlowFile(contentPromise, entrypoint),
            fs.writeFile(
              path.join(entrypoint.directory, entrypoint.main),
              `'use strict';

let unregister = require('${require.resolve("./hook")}').___internalHook('${
                project.directory
              }');

module.exports = require('${entrypoint.source}');

unregister();
`
            )
          ];
          if (entrypoint.module) {
            promises.push(
              fs.symlink(
                entrypoint.source,
                path.join(entrypoint.directory, entrypoint.module)
              )
            );
          }
          let browserField = entrypoint.browser;
          if (browserField) {
            for (let key of Object.keys(browserField)) {
              promises.push(
                fs.symlink(
                  path.join(entrypoint.directory, key),
                  path.join(entrypoint.directory, browserField[key])
                )
              );
            }
          }
          let rnField = entrypoint.reactNative;
          if (rnField) {
            for (let key of Object.keys(rnField)) {
              promises.push(
                fs.symlink(
                  path.join(entrypoint.directory, key),
                  path.join(entrypoint.directory, rnField[key])
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

  success("created symlinks!");
}
