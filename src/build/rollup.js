// @flow
const prettier = require("rollup-plugin-prettier");
const resolve = require("rollup-plugin-node-resolve");
const { uglify } = require("rollup-plugin-uglify");
const babel = require("rollup-plugin-babel");
const alias = require("rollup-plugin-alias");
const cjs = require("rollup-plugin-commonjs");
const replace = require("rollup-plugin-replace");

const chalk = require("chalk");
import path from "path";
import builtInModules from "builtin-modules";
import { StrictPackage } from "../package";
import { rollup as _rollup } from "rollup";
import type { Aliases } from "./aliases";
import { FatalError } from "../errors";
import { confirms } from "../messages";
import installPackages from "install-packages";
import pLimit from "p-limit";

// this makes sure nested imports of external packages are external
const makeExternalPredicate = externalArr => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return (id: string) => pattern.test(id);
};

let unsafeRequire = require;

let pkgJsonsAllowedToFail = [
  // the package.json can't be found for this package on ci so for now,
  // we're just going to ignore it
  // TODO: investigate why it fails
  "nopt"
];

function getChildPeerDeps(
  finalPeerDeps: Array<string>,
  isUMD: boolean,
  depKeys: Array<string>,
  doneDeps: Array<string>
) {
  depKeys.filter(x => !doneDeps.includes(x)).forEach(key => {
    let pkgJson;
    try {
      pkgJson = unsafeRequire(key + "/package.json");
    } catch (err) {
      if (
        err.code === "MODULE_NOT_FOUND" &&
        pkgJsonsAllowedToFail.includes(key)
      ) {
        return;
      }
      throw err;
    }
    if (pkgJson.peerDependencies) {
      finalPeerDeps.push(...Object.keys(pkgJson.peerDependencies));
      getChildPeerDeps(
        finalPeerDeps,
        isUMD,
        Object.keys(pkgJson.peerDependencies),
        doneDeps
      );
    }
    // when we're building a UMD bundle, we're also bundling the dependencies so we need
    // to get the peerDependencies of dependencies
    if (pkgJson.dependencies && isUMD) {
      doneDeps.push(...Object.keys(pkgJson.dependencies));
      getChildPeerDeps(
        finalPeerDeps,
        isUMD,
        Object.keys(pkgJson.dependencies),
        doneDeps
      );
    }
  });
}

let limit = pLimit(1);

import type { RollupSingleFileBuild } from "./types";

export let rollup: RollupConfig => Promise<RollupSingleFileBuild> = _rollup;

export opaque type RollupConfig = Object;

export type RollupConfigType = "umd" | "browser" | "node-dev" | "node-prod";

export let getRollupConfig = (
  pkg: StrictPackage,
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
  getChildPeerDeps(
    external,
    type === "umd",
    external.concat(
      type === "umd" && pkg.dependencies ? Object.keys(pkg.dependencies) : []
    ),
    []
  );
  if (type === "node-dev" || type === "node-prod") {
    external.push(...builtInModules);
  }

  const config = {
    input: path.join(pkg.directory, "src", "index.js"),
    external: makeExternalPredicate(external),
    onwarn: (warning: *) => {
      switch (warning.code) {
        case "UNUSED_EXTERNAL_IMPORT": {
          break;
        }
        case "UNRESOLVED_IMPORT": {
          if (warning.source === "object-assign") {
            throw (async () => {
              let shouldInstallObjectAssign = await confirms.shouldInstallObjectAssign(
                pkg
              );
              if (shouldInstallObjectAssign) {
                await limit(() =>
                  installPackages({
                    packages: ["object-assign"],
                    cwd: pkg.directory,
                    installPeers: false
                  })
                );
                await pkg.refresh();
              } else {
                throw new FatalError(
                  `object-assign should be in dependencies of ${pkg.name}`
                );
              }
            })();
          }
        }
        default: {
          throw new Error(
            `There was an error compiling ${pkg.name}: ${chalk.red(
              warning.toString()
            )}`
          );
        }
      }
    },
    plugins: [
      babel({
        presets: [
          [
            "@babel/env",
            {
              loose: true,
              modules: false,
              exclude: ["transform-typeof-symbol"]
            }
          ],
          "@babel/react",
          "@babel/flow"
        ],
        plugins: [
          "@babel/plugin-transform-flow-strip-types",
          require("./add-basic-constructor-to-react-component"),
          "codegen",
          ["@babel/proposal-class-properties", { loose: true }],
          require("./fix-dce-for-classes-with-statics"),
          [
            "@babel/plugin-proposal-object-rest-spread",
            { loose: true, useBuiltIns: type !== "umd" }
          ],
          type !== "umd" && "babel-plugin-transform-import-object-assign"
        ].filter(Boolean),
        configFile: false,
        babelrc: false
      }),
      cjs(),
      (type === "browser" || type === "umd") &&
        replace({
          "typeof document": JSON.stringify("object"),
          "typeof window": JSON.stringify("object")
        }),
      type === "umd" && alias(aliases),
      type === "umd" && resolve(),
      (type === "umd" || type === "node-prod") &&
        replace({
          "process.env.NODE_ENV": '"production"'
        }),

      type === "umd" && uglify(),
      type === "node-prod" &&
        uglify({
          mangle: false
        }),
      type === "node-prod" && prettier({ parser: "babylon" })
    ].filter(Boolean)
  };

  return config;
};
