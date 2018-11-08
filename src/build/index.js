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
import del from "del";

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

  await del(path.join(pkg.directory, "dist"), {
    cwd: pkg.directory,
    force: true
  });

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
  if (bundles[0].modules[0].originalCode.includes("@flow")) {
    let hasDefaultExport = bundles[0].exports.includes("default");
    await fs.writeFile(
      // flow only resolves via the main field so
      // we only have to write a flow file for the main field
      path.resolve(pkg.directory, pkg.main) + ".flow",
      `// @flow
export * from "../src/index.js";${
        hasDefaultExport ? `\nexport { default } from "../src/index.js";` : ""
      }\n`
    );
  }
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
