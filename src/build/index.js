// @flow
import { Package } from "../package";
import { Project } from "../project";
import path from "path";
import { rollup } from "./rollup";
import { type Aliases, getAliases } from "./aliases";
import * as logger from "../logger";
import * as fs from "fs-extra";
import { confirms, errors } from "../messages";
import { FatalError } from "../errors";
import { getValidBrowserField } from "../utils";
import { getDevPath } from "./utils";
import { getRollupConfigs } from "./config";
import { writeOtherFiles } from "./utils";
import { createWorker, destroyWorker } from "../worker-client";

let browserPattern = /typeof\s+(window|document)/;

async function buildPackage(pkg: Package, aliases: Aliases) {
  let configs = getRollupConfigs(pkg, aliases);
  await fs.remove(path.join(pkg.directory, "dist"));

  let hasCheckedBrowser = pkg.entrypoints.every(x => x.browser);

  let entrypointsByCjsDevPath = {};
  pkg.entrypoints
    .map(x => x.strict())
    .forEach(x => {
      entrypointsByCjsDevPath[getDevPath(x.main)] = x;
    });

  let [sampleOutput] = await Promise.all(
    configs.map(async ({ config, outputs }) => {
      let bundle = await rollup(config);
      let result = await Promise.all(
        outputs.map(async outputConfig => {
          let ret = await bundle.write(outputConfig);
          return ret;
        })
      );

      let nodeDevOutput = result[0].output;

      if (!hasCheckedBrowser) {
        hasCheckedBrowser = true;

        let entries = [];
        let chunks = [];
        nodeDevOutput.forEach(x => {
          if (x.isEntry) {
            entries.push(x);
          } else {
            chunks.push(x);
          }
        });

        let entrypointsThatNeedABrowserBuild = [];

        if (browserPattern.test(nodeDevOutput.code)) {
          throw (async () => {
            let shouldAddBrowserField = await confirms.addBrowserField(pkg);
            if (shouldAddBrowserField) {
              pkg.entrypoints[0].browser = getValidBrowserField(
                pkg.entrypoints[0]
              );
              await pkg.entrypoints[0].save();
            } else {
              throw new FatalError(errors.deniedWriteBrowserField, pkg);
            }
          })();
        }
      }
      return nodeDevOutput;
    })
  );

  // TODO: fix this.
  const source = await fs.readFile(pkg.entrypoints[0].source, "utf8");

  let flowMode = false;
  if (source.includes("@flow")) {
    flowMode = sampleOutput.exports.includes("default") ? "all" : "named";
  }

  await Promise.all(
    pkg.entrypoints.map(entrypoint => {
      return writeOtherFiles(entrypoint.strict(), flowMode);
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
    throw err;
  }
}

export default async function build(directory: string) {
  // do more stuff with checking whether the repo is using yarn workspaces or bolt
  try {
    createWorker();

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
