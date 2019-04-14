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
  for (let pkg of project.packages) {
    let strictEntrypoints = pkg.entrypoints.map(x => x.strict());
    for (let entrypoint of strictEntrypoints) {
      let filesNeeded: Array<string> = [entrypoint.main];

      if (entrypoint.module) {
        filesNeeded.push(entrypoint.module);
      }

      let browserField = entrypoint.browser;
      if (browserField) {
        filesNeeded.push(
          ...Object.keys(browserField).map(x => browserField[x])
        );
      }
      filesNeeded.forEach(filepath => {
        promises.push(
          fs.ensureSymlink(
            entrypoint.source,
            path.join(entrypoint.directory, filepath)
          )
        );
      });
    }
  }
  await Promise.all(promises);

  success("created symlinks!");
}
