import { Package } from "../package";
import { Project } from "../project";
import { rollup } from "rollup";
import { Aliases, getAliases } from "./aliases";
import * as logger from "../logger";
import {
  FatalError,
  UnexpectedBuildError,
  ScopelessError,
  BatchError,
} from "../errors";
import { getRollupConfigs } from "./config";
import { createWorker, destroyWorker } from "../worker-client";
import { validateProject } from "../validate";
import { cleanProjectBeforeBuild } from "./utils";

async function buildPackage(pkg: Package, aliases: Aliases) {
  let configs = getRollupConfigs(pkg, aliases);

  await Promise.all(
    configs.map(async ({ config, outputs }) => {
      let bundle = await rollup(config);
      return Promise.all(
        outputs.map((outputConfig) => {
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
    if (
      err instanceof FatalError ||
      err instanceof BatchError ||
      err instanceof ScopelessError
    ) {
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
    let project = await Project.create(directory);

    validateProject(project);

    logger.info("building bundles!");

    await cleanProjectBeforeBuild(project);

    let aliases = getAliases(project);
    let errors: FatalError[] = [];

    await Promise.all(
      project.packages.map(async (pkg) => {
        try {
          await retryableBuild(pkg, aliases);
        } catch (err) {
          if (err instanceof BatchError) {
            errors.push(...err.errors);
          } else {
            errors.push(err);
          }
        }
      })
    );

    if (errors.length) {
      throw new BatchError(
        errors.sort((a, b) =>
          (a.scope + a.message).localeCompare(b.scope + b.message)
        )
      );
    }

    logger.success("built bundles!");
  } finally {
    destroyWorker();
  }
}
