// @flow
import { Package, StrictPackage } from "../package";
import * as logger from "../logger";
import path from "path";
import { rollup } from "./rollup";
import { type Aliases, getAliases } from "./aliases";
import * as fs from "fs-extra";
import { confirms, errors } from "../messages";
import { FatalError } from "../errors";
import { getValidBrowserField } from "../utils";
import { getRollupConfigs } from "./config";
import { writeOtherFiles } from "./utils";

let browserPattern = /typeof\s+(window|document)/;

async function buildPackage(pkg: StrictPackage, aliases: Aliases) {
  let configs = getRollupConfigs(pkg, aliases);
  await fs.remove(path.join(pkg.directory, "dist"));

  let hasCheckedBrowser = pkg.browser !== null;

  let bundles = await Promise.all(
    configs.map(async ({ config, outputs }) => {
      // $FlowFixMe this is not a problem with flow, i did something wrong but it's not worth fixing right now
      const bundle = await rollup(config);

      let result = await Promise.all(
        outputs.map(outputConfig => {
          return bundle.write(outputConfig);
        })
      );
      let thing = result.find(x => x && x.code);
      if (!hasCheckedBrowser && thing && thing.code) {
        hasCheckedBrowser = true;
        if (browserPattern.test(thing.code)) {
          throw (async () => {
            let shouldAddBrowserField = await confirms.addBrowserField(pkg);
            if (shouldAddBrowserField) {
              pkg.browser = getValidBrowserField(pkg);
              await pkg.save();
            } else {
              throw new FatalError(errors.deniedWriteBrowserField, pkg);
            }
          })();
        }
      }
      return bundle;
    })
  );
  let flowMode = false;
  if (bundles[0].modules[0].originalCode.includes("@flow")) {
    flowMode = bundles[0].exports.includes("default") ? "all" : "named";
  }

  await writeOtherFiles(pkg, flowMode);
}

async function retryableBuild(pkg: StrictPackage, aliases: Aliases) {
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
  let pkg = await Package.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  let packages = await pkg.packages();
  if (packages === null) {
    let strictPackage = pkg.strict();
    await retryableBuild(strictPackage, {});
  } else {
    let strictPackages = packages.map(x => x.strict());
    let aliases = getAliases(strictPackages);
    await Promise.all(strictPackages.map(pkg => retryableBuild(pkg, aliases)));
  }
  logger.success("built bundles!");
}
