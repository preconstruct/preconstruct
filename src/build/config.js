// @flow
import { Package } from "../package";
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
  pkg: Package
) {
  depKeys
    .filter(x => !doneDeps.includes(x))
    .forEach(key => {
      let pkgJson = unsafeRequire(
        resolveFrom(pkg.directory, key + "/package.json")
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

function getGlobals(pkg: Package, aliases) {
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
    obj[pkgName] = pkg.project.global(pkgName);
    return obj;
  }, {});
}

export function getRollupConfigs(pkg: Package, aliases: Aliases) {
  let configs: Array<{
    config: RollupConfig,
    outputs: Array<OutputOptions>
  }> = [];

  let entry = pkg.entrypoints[0].strict();

  configs.push({
    config: getRollupConfig(pkg, aliases, "node-dev"),
    outputs: [
      {
        format: "cjs",
        file: path.join(entry.directory, getDevPath(entry.main)),
        exports: "named"
      },
      ...(entry.module
        ? [
            {
              format: "es",
              file: path.join(entry.directory, entry.module)
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
        file: path.join(entry.directory, getProdPath(entry.main)),
        exports: "named"
      }
    ]
  });
  let { umdMain } = entry;
  if (umdMain !== null) {
    let umdName = is(entry._config.umdName, is.string);
    configs.push({
      config: getRollupConfig(pkg, aliases, "umd"),
      outputs: [
        {
          format: "umd",
          sourcemap: true,
          file: path.join(entry.directory, umdMain),
          name: umdName,
          globals: getGlobals(pkg, aliases)
        }
      ]
    });
  }

  if (entry.browser !== null) {
    configs.push({
      config: getRollupConfig(pkg, aliases, "browser"),
      outputs: [
        {
          format: "cjs",
          file: path.join(entry.directory, getValidCjsBrowserPath(entry)),
          exports: "named"
        },
        {
          format: "es",
          file: path.join(entry.directory, getValidModuleBrowserPath(entry))
        }
      ]
    });
  }

  if (entry.reactNative !== null) {
    configs.push({
      config: getRollupConfig(pkg, aliases, "react-native"),
      outputs: [
        {
          format: "cjs",
          file: path.join(entry.directory, getValidCjsReactNativePath(entry)),
          exports: "named"
        },
        {
          format: "es",
          file: path.join(entry.directory, getValidModuleReactNativePath(entry))
        }
      ]
    });
  }
  return configs;
}
