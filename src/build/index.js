// @flow
import { Package, StrictPackage } from "../package";
import * as logger from "../logger";
import path from "path";
import { validatePackage } from "../validate";
import { type RollupConfig, getRollupConfig, rollup } from "./rollup";
import type { OutputOptions } from "./types";
import { type Aliases, getAliases } from "./aliases";
import is from "sarcastic";
import * as fs from "fs-extra";

function getDevPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".dev.js");
}

function getProdPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".prod.js");
}

async function buildPackage(pkg: StrictPackage, aliases: Aliases) {
  let configs: Array<{
    config: RollupConfig,
    outputs: Array<OutputOptions>
  }> = [];

  configs.push({
    config: getRollupConfig(pkg, aliases, "node-dev"),
    outputs: [
      {
        format: "cjs",
        file: path.join(pkg.directory, getDevPath(pkg.main)),
        exports: "named"
      },
      ...(pkg.module
        ? [
            {
              format: "es",
              file: path.join(pkg.directory, pkg.module)
            }
          ]
        : [])
    ]
  });
  configs.push({
    config: getRollupConfig(pkg, aliases, "node-prod"),
    outputs: [
      {
        format: "cjs",
        file: path.join(pkg.directory, getProdPath(pkg.main)),
        exports: "named"
      }
    ]
  });
  let { umdMain } = pkg;
  if (umdMain !== null) {
    let umdName = is(pkg.config.umdName, is.string);
    configs.push({
      config: getRollupConfig(pkg, aliases, "umd"),
      outputs: [
        {
          format: "umd",
          sourcemap: true,
          file: path.join(pkg.directory, umdMain),
          name: umdName
        }
      ]
    });
  }

  await fs.remove(path.join(pkg.directory, "dist"));

  let bundles = await Promise.all(
    configs.map(async ({ config, outputs }) => {
      // $FlowFixMe this is not a problem with flow, i did something wrong but it's not worth fixing right now
      const bundle = await rollup(config);

      await Promise.all(
        outputs.map(outputConfig => {
          return bundle.write(outputConfig);
        })
      );
      return bundle;
    })
  );
  let promises = [];
  if (bundles[0].modules[0].originalCode.includes("@flow")) {
    let hasDefaultExport = bundles[0].exports.includes("default");
    promises.push(
      fs.writeFile(
        // flow only resolves via the main field so
        // we only have to write a flow file for the main field
        path.resolve(pkg.directory, pkg.main) + ".flow",
        `// @flow
export * from "../src/index.js";${
          hasDefaultExport ? `\nexport { default } from "../src/index.js";` : ""
        }\n`
      )
    );
  }
  promises.push(
    fs.writeFile(
      path.join(pkg.directory, pkg.main),
      `'use strict';

if (process.env.NODE_ENV === "production") {
  module.exports = require("./${path.basename(getProdPath(pkg.main))}");
} else {
  module.exports = require("./${path.basename(getDevPath(pkg.main))}");
}`
    )
  );
  await Promise.all(promises);
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
