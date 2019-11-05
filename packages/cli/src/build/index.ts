import { Package } from "../package";
import { Project } from "../project";
import path from "path";
import { rollup, OutputChunk } from "rollup";
import { Aliases, getAliases } from "./aliases";
import * as logger from "../logger";
import * as fs from "fs-extra";
import { FatalError, UnexpectedBuildError, ScopelessError } from "../errors";
import { getRollupConfigs } from "./config";
import { createWorker, destroyWorker } from "../worker-client";
import { hasherPromise } from "../rollup-plugins/babel";

async function buildPackage(pkg: Package, aliases: Aliases) {
  let configs = getRollupConfigs(pkg, aliases);
  await Promise.all([
    fs.remove(path.join(pkg.directory, "dist")),
    ...pkg.entrypoints.map(async entrypoint => {
      await fs.remove(path.join(entrypoint.directory, "dist"));
      await fs.mkdir(path.join(entrypoint.directory, "dist"));
    })
  ]);

  await Promise.all(
    configs.map(async ({ config, outputs }) => {
      let bundle = await rollup(config);
      await Promise.all(
        outputs.map(outputConfig => {
          return bundle.write(outputConfig);
        })
      );
    })
  );
}

async function retryableBuild(pkg: Package, aliases: Aliases) {
  try {
    await buildPackage(pkg, aliases);
  } catch (err) {
    if (err instanceof Promise) {
      await err;
      await retryableBuild(pkg, aliases);
      return;
    }
    if (err instanceof FatalError || err instanceof ScopelessError) {
      throw err;
    }
    if (err.pluginCode === "BABEL_PARSE_ERROR") {
      throw new ScopelessError(err.message);
    }
    throw new UnexpectedBuildError(err, pkg.name);
  }
}

export default async function build(directory: string) {
  // do more stuff with checking whether the repo is using yarn workspaces or bolt
  try {
    createWorker();
    await hasherPromise;
    let project = await Project.create(directory);

    logger.info("building bundles!");

    let aliases = getAliases(project);
    await Promise.all(
      project.packages.map(pkg => retryableBuild(pkg, aliases))
    );

    logger.success("built bundles!");
  } finally {
    destroyWorker();
  }
}
