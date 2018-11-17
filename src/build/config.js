// @flow
import { StrictPackage } from "../package";
import path from "path";
import { type RollupConfig, getRollupConfig } from "./rollup";
import type { OutputOptions } from "./types";
import type { Aliases } from "./aliases";
import is from "sarcastic";
import { getValidCjsBrowserPath, getValidModuleBrowserPath } from "../utils";
import { getDevPath, getProdPath } from "./utils";

export function getRollupConfigs(pkg: StrictPackage, aliases: Aliases) {
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
    let umdName = is(pkg._config.umdName, is.string);
    configs.push({
      config: getRollupConfig(pkg, aliases, "umd"),
      outputs: [
        {
          format: "umd",
          sourcemap: true,
          file: path.join(pkg.directory, umdMain),
          name: umdName,
          globals:
            pkg.peerDependencies === null
              ? {}
              : Object.keys(pkg.peerDependencies).reduce((obj, pkgName) => {
                  obj[pkgName] = pkg.global(pkgName);
                  return obj;
                }, {})
        }
      ]
    });
  }

  if (pkg.browser !== null) {
    configs.push({
      config: getRollupConfig(pkg, aliases, "browser"),
      outputs: [
        {
          format: "cjs",
          file: path.join(pkg.directory, getValidCjsBrowserPath(pkg)),
          exports: "named"
        },
        {
          format: "es",
          file: path.join(pkg.directory, getValidModuleBrowserPath(pkg))
        }
      ]
    });
  }
  return configs;
}
