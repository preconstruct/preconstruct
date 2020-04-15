import { Package } from "../package";
import { Project } from "../project";
import path from "path";
import { rollup } from "rollup";
import { Aliases, getAliases } from "./aliases";
import * as logger from "../logger";
import * as fs from "fs-extra";
import {
  FatalError,
  UnexpectedBuildError,
  ScopelessError,
  BatchError
} from "../errors";
import { getRollupConfigs } from "./config";
import { createWorker, destroyWorker } from "../worker-client";
import { hasherPromise } from "../rollup-plugins/babel";
import { isTsPath } from "../rollup-plugins/typescript-declarations";
import { writeDevTSFile } from "../dev";

async function buildPackage(pkg: Package, aliases: Aliases) {
  let configs = getRollupConfigs(pkg, aliases);

  let outputs = await Promise.all(
    configs.map(async ({ config, outputs }) => {
      let bundle = await rollup(config);
      return Promise.all(
        outputs.map(outputConfig => {
          return bundle.generate(outputConfig);
        })
      );
    })
  );
  await Promise.all(
    outputs.map(x => {
      return Promise.all(
        x.map(bundle => {
          return Promise.all(
            bundle.output.map(output => {
              return fs.outputFile(
                path.join(pkg.directory, output.fileName),
                output.type === "asset" ? output.source : output.code
              );
            })
          );
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
    await hasherPromise;
    let project = await Project.create(directory);

    logger.info("building bundles!");

    let aliases = getAliases(project);
    let errors: FatalError[] = [];
    await Promise.all(
      project.packages.map(async pkg => {
        await Promise.all([
          fs.remove(path.join(pkg.directory, "dist")),
          ...pkg.entrypoints.map(entrypoint => {
            return fs.remove(path.join(entrypoint.directory, "dist"));
          })
        ]);

        await Promise.all(
          pkg.entrypoints.map(async entrypoint => {
            if (isTsPath(entrypoint.source)) {
              await fs.mkdir(path.join(entrypoint.directory, "dist"));
              await writeDevTSFile(
                entrypoint.strict(),
                await fs.readFile(entrypoint.source, "utf8")
              );
            }
          })
        );
      })
    );

    await Promise.all(
      project.packages.map(async pkg => {
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
