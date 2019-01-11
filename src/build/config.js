// @flow
import { StrictPackage } from "../package";
import path from "path";
import { type RollupConfig, getRollupConfig } from "./rollup";
import type { OutputOptions } from "./types";
import type { Aliases } from "./aliases";
import is from "sarcastic";
import {
  getValidCjsBrowserPath,
  getValidModuleBrowserPath,
  getValidCjsReactNativePath,
  getValidModuleReactNativePath
} from "../utils";
import { getDevPath, getProdPath } from "./utils";
import resolveFrom from "resolve-from";

let unsafeRequire = require;

function getChildDeps(
  finalPeerDeps: Array<string>,
  depKeys: Array<string>,
  doneDeps: Array<string>,
  aliases: Aliases,
  pkg: StrictPackage
) {
  depKeys
    .filter(x => !doneDeps.includes(x))
    .forEach(key => {
      let pkgJson = unsafeRequire(
        resolveFrom(
          pkg.directory,
          aliases[key] !== undefined
            ? aliases[key].replace("src/index.js", "package.json")
            : key + "/package.json"
        )
      );

      if (pkgJson.peerDependencies) {
        finalPeerDeps.push(...Object.keys(pkgJson.peerDependencies));
      }
      if (pkgJson.dependencies) {
        doneDeps.push(...Object.keys(pkgJson.dependencies));
        getChildDeps(
          finalPeerDeps,
          Object.keys(pkgJson.dependencies),
          doneDeps,
          aliases,
          pkg
        );
      }
    });
}

function getGlobals(pkg: StrictPackage, aliases) {
  let stuff = [];

  if (pkg.peerDependencies) {
    stuff.push(...Object.keys(pkg.peerDependencies));
  }
  if (pkg.dependencies) {
    stuff.push(...Object.keys(pkg.dependencies));
  }

  if (stuff.length === 0) {
    return {};
  }

  let finalPeerDeps = pkg.peerDependencies
    ? Object.keys(pkg.peerDependencies)
    : [];

  getChildDeps(finalPeerDeps, stuff, [], aliases, pkg);

  return finalPeerDeps.reduce((obj, pkgName) => {
    obj[pkgName] = pkg.global(pkgName);
    return obj;
  }, {});
}

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
          globals: getGlobals(pkg, aliases)
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

  if (pkg.reactNative !== null) {
    configs.push({
      config: getRollupConfig(pkg, aliases, "react-native"),
      outputs: [
        {
          format: "cjs",
          file: path.join(pkg.directory, getValidCjsReactNativePath(pkg)),
          exports: "named"
        },
        {
          format: "es",
          file: path.join(pkg.directory, getValidModuleReactNativePath(pkg))
        }
      ]
    });
  }
  return configs;
}
