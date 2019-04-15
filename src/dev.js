// @flow
import { Project } from "./project";
import { success, info } from "./logger";
import * as fs from "fs-extra";
import path from "path";

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
          await fs.remove(path.join(entrypoint.directory, "dist"));

          await fs.ensureDir(path.join(entrypoint.directory, "dist"));
          let promises = [
            fs.writeFile(
              path.join(entrypoint.directory, entrypoint.main),
              `${
                (await fs.readFile(entrypoint.source, "utf-8")).includes(
                  "@flow"
                )
                  ? "// @flow\n"
                  : ""
              }'use strict';

let unregister = require('${require.resolve("./hook")}').___internalHook();

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
