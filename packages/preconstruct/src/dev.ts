// @flow
import { Project } from "./project";
import { success, info } from "./logger";
import { tsTemplate, flowTemplate } from "./utils";
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

async function writeTypeSystemFile(typeSystemPromise, entrypoint) {
  let [typeSystem, content] = await typeSystemPromise;
  if (typeSystem === null) return;
  let cjsDistPath = path.join(entrypoint.directory, entrypoint.main);

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
            writeTypeSystemFile(typeSystemPromise, entrypoint),
            fs.writeFile(
              path.join(entrypoint.directory, entrypoint.main),
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
                require.resolve("@preconstruct/hook")
              )}).___internalHook(${JSON.stringify(project.directory)});

// this re-exports the source file
module.exports = require(${JSON.stringify(entrypoint.source)});

// this unregisters the require hook so that any modules required after this one
// aren't compiled with the require hook in case you have some other require hook
// or something that should be used on other modules
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

          return Promise.all(promises);
        })
      );
    })
  );

  await Promise.all(promises);

  success("created links!");
}
