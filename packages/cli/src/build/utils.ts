import { Project } from "../project";
import { isTsPath } from "../rollup-plugins/typescript-declarations";
import { writeDevTSFile, writeTSReexportFile } from "../dev";
import * as fs from "fs-extra";
import path from "path";
import normalizePath from "normalize-path";

export function getDevPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".dev.js");
}

export function getProdPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".prod.js");
}

export async function cleanProjectBeforeBuild(project: Project) {
  await Promise.all(
    project.packages.map(async (pkg) => {
      await Promise.all([
        fs.remove(path.join(pkg.directory, "dist")),
        ...pkg.entrypoints
          .filter((entrypoint) => entrypoint.name !== pkg.name)
          .map((entrypoint) => {
            return fs.remove(path.join(entrypoint.directory, "dist"));
          }),
      ]);

      await Promise.all(
        pkg.entrypoints.map(async (entrypoint) => {
          if (isTsPath(entrypoint.source)) {
            await fs.mkdir(path.join(entrypoint.directory, "dist"));
            await writeTSReexportFile(
              entrypoint,
              await fs.readFile(entrypoint.source, "utf8"),
              normalizePath(entrypoint.source).replace(
                normalizePath(entrypoint.directory),
                normalizePath(
                  path.join(entrypoint.directory, "dist", "declarations")
                )
              )
            );
          }
        })
      );
    })
  );
}
