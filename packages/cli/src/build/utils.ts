import { Project } from "../project";
import { isTsPath } from "../rollup-plugins/typescript-declarations";
import {
  entrypointHasDefaultExport,
  hasDtsFile,
  writeDevTSFiles,
} from "../dev";
import * as fs from "fs-extra";
import path from "path";

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
      const isTypeModule = pkg.isTypeModule();

      await Promise.all(
        pkg.entrypoints.map(async (entrypoint) => {
          if (isTsPath(entrypoint.source) || (await hasDtsFile(entrypoint))) {
            if (!isTypeModule) {
              await fs.mkdir(path.join(entrypoint.directory, "dist"));
            }
            await writeDevTSFiles(
              entrypoint,
              await entrypointHasDefaultExport(
                entrypoint,
                await fs.readFile(entrypoint.source, "utf8")
              )
            );
          }
        })
      );
    })
  );
}
