// @flow
const resolve = require("rollup-plugin-node-resolve");
const alias = require("rollup-plugin-alias");
const cjs = require("rollup-plugin-commonjs");
const replace = require("rollup-plugin-replace");
const resolveFrom = require("resolve-from");
const chalk = require("chalk");
import path from "path";
import builtInModules from "builtin-modules";
import { Package } from "../package";
import { StrictEntrypoint } from "../entrypoint";
import { rollup as _rollup } from "rollup";
import type { Aliases } from "./aliases";
import { FatalError } from "../errors";
import { confirms } from "../messages";
import rewriteCjsRuntimeHelpers from "../rollup-plugins/rewrite-cjs-runtime-helpers";
import flowAndNodeDevProdEntry from "../rollup-plugins/flow-and-prod-dev-entry";
import typescriptDeclarations from "../rollup-plugins/typescript-declarations";
import babel from "../rollup-plugins/babel";
import terser from "../rollup-plugins/terser";
import { limit } from "../prompt";
import { getNameForDist } from "../utils";
import { EXTENSIONS } from "../constants";

import installPackages from "install-packages";

// this makes sure nested imports of external packages are external
const makeExternalPredicate = externalArr => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return (id: string) => pattern.test(id);
};

import type { RollupSingleFileBuild } from "./types";

export let rollup: RollupConfig => Promise<RollupSingleFileBuild> = _rollup;

export opaque type RollupConfig = Object;

export function toUnsafeRollupConfig(config: RollupConfig): Object {
  return config;
}

export type RollupConfigType =
  | "umd"
  | "browser"
  | "node-dev"
  | "node-prod"
  | "react-native";

export let getRollupConfig = (
  pkg: Package,
  entrypoints: Array<StrictEntrypoint>,
  aliases: Aliases,
  type: RollupConfigType
): RollupConfig => {
  let external = [];
  if (pkg.peerDependencies) {
    external.push(...Object.keys(pkg.peerDependencies));
  }
  if (pkg.dependencies && type !== "umd") {
    external.push(...Object.keys(pkg.dependencies));
  }

  if (type === "node-dev" || type === "node-prod") {
    external.push(...builtInModules);
  }

  let rollupAliases = {};

  Object.keys(aliases).forEach(key => {
    try {
      rollupAliases[key] = resolveFrom(pkg.directory, aliases[key]);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") {
        throw err;
      }
    }
  });

  let input = {};

  entrypoints.forEach(entrypoint => {
    input[
      path.relative(
        pkg.directory,
        path.join(entrypoint.directory, "dist", getNameForDist(pkg.name))
      )
    ] = entrypoint.strict().source;
  });

  const config = {
    input,
    external: makeExternalPredicate(external),
    onwarn: (warning: *) => {
      switch (warning.code) {
        case "UNUSED_EXTERNAL_IMPORT": {
          break;
        }
        case "UNRESOLVED_IMPORT": {
          if (/^@babel\/runtime\/helpers\//.test(warning.source)) {
            throw (async () => {
              let shouldInstallBabelRuntime = await confirms.shouldInstallBabelRuntime(
                pkg
              );

              if (shouldInstallBabelRuntime) {
                await limit(() =>
                  installPackages({
                    packages: ["@babel/runtime"],
                    cwd: pkg.directory,
                    installPeers: false,
                    packageManager: pkg.project.isBolt ? "bolt" : undefined
                  })
                );
                await pkg.refresh();
              } else {
                throw new FatalError(
                  `@babel/runtime should be in dependencies of ${pkg.name}`,
                  pkg.name
                );
              }
            })();
          }
          if (!warning.source.startsWith(".")) {
            throw new FatalError(
              `"${warning.source}" is imported by "${path.relative(
                pkg.directory,
                warning.importer
              )}" but it is not specified in dependencies or peerDependencies`,
              pkg.name
            );
          }
        }
        default: {
          throw new FatalError(
            `There was an error compiling ${pkg.name}: ${chalk.red(
              warning.toString()
            )}`,
            pkg.name
          );
        }
      }
    },
    plugins: [
      type === "node-prod" && flowAndNodeDevProdEntry(pkg),
      type === "node-prod" && typescriptDeclarations(pkg),
      babel({
        cwd: pkg.project.directory,
        plugins: [
          [
            require.resolve("@babel/plugin-transform-runtime"),
            { useESModules: true }
          ]
        ],
        extensions: EXTENSIONS
      }),
      type === "umd" &&
        cjs({ include: ["**/node_modules/**", "node_modules/**"] }),
      (type === "browser" || type === "umd") &&
        replace({
          "typeof document": JSON.stringify("object"),
          "typeof window": JSON.stringify("object")
        }),
      rewriteCjsRuntimeHelpers(),
      type === "umd" && alias(rollupAliases),
      resolve({
        extensions: EXTENSIONS,
        customResolveOptions: {
          moduleDirectory: type === "umd" ? "node_modules" : []
        }
      }),
      (type === "umd" || type === "node-prod") &&
        replace({
          "process.env.NODE_ENV": '"production"'
        }),
      type === "umd" && terser(),
      type === "node-prod" &&
        terser({
          mangle: false,
          output: {
            beautify: true,
            indent_level: 2
          }
        })
    ].filter(Boolean)
  };

  return config;
};
