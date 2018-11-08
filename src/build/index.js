// @flow
import { Package, StrictPackage } from "../package";
import * as logger from "../logger";
import path from "path";
import { validatePackage } from "../validate";
import { type RollupConfig, getRollupConfig, rollup } from "./rollup";
import type { OutputOptions } from "./types";
import { type Aliases, getAliases } from "./aliases";
import is from "sarcastic";

function getOutputConfigs(pkg: StrictPackage): Array<OutputOptions> {
  let configs = [
    {
      format: "cjs",
      file: path.join(pkg.directory, pkg.main),
      exports: "named"
    }
  ];
  if (pkg.module) {
    configs.push({
      format: "es",
      file: path.join(pkg.directory, pkg.module)
    });
  }
  return configs;
}

async function buildPackage(pkg: StrictPackage, aliases: Aliases) {
  let configs: Array<{
    config: RollupConfig,
    outputs: Array<OutputOptions>
  }> = [];

  configs.push({
    config: getRollupConfig(pkg, aliases, "node-dev"),
    outputs: getOutputConfigs(pkg)
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

  let someBundle;

  await Promise.all(
    configs.map(async ({ config, outputs }) => {
      const bundle = await rollup(config);
      if (!someBundle) someBundle = bundle;

      await Promise.all(
        outputs.map(outputConfig => {
          return bundle.write(outputConfig);
        })
      );
    })
  );
}

export default async function build(directory: string) {
  let pkg = await Package.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  let packages = await pkg.packages();
  if (packages === null) {
    let strictPackage = pkg.strict();
    await buildPackage(strictPackage, {});
  } else {
    let strictPackages = packages.map(x => x.strict());
    let aliases = getAliases(strictPackages);
    await Promise.all(strictPackages.map(pkg => buildPackage(pkg, aliases)));
  }
  logger.success("built bundles!");
}
