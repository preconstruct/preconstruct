import resolve from "rollup-plugin-node-resolve";
// @ts-ignore
import alias from "@rollup/plugin-alias";
import cjs from "rollup-plugin-commonjs";
import replace from "@rollup/plugin-replace";
import resolveFrom from "resolve-from";
import chalk from "chalk";
import path from "path";
import builtInModules from "builtin-modules";
import { Package } from "../package";
import { StrictEntrypoint } from "../entrypoint";
import { RollupOptions, Plugin } from "rollup";
import { Aliases } from "./aliases";
import { FatalError, BatchError } from "../errors";
import rewriteBabelRuntimeHelpers from "../rollup-plugins/rewrite-babel-runtime-helpers";
import flowAndNodeDevProdEntry from "../rollup-plugins/flow-and-prod-dev-entry";
import typescriptDeclarations from "../rollup-plugins/typescript-declarations";
import json from "rollup-plugin-json";
import babel from "../rollup-plugins/babel";
import terser from "../rollup-plugins/terser";
import { getNameForDist } from "../utils";
import { EXTENSIONS } from "../constants";

// this makes sure nested imports of external packages are external
const makeExternalPredicate = (externalArr: string[]) => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return (id: string) => pattern.test(id);
};

export type RollupConfigType = "umd" | "browser" | "node-dev" | "node-prod";

export let getRollupConfig = (
  pkg: Package,
  entrypoints: Array<StrictEntrypoint>,
  aliases: Aliases,
  type: RollupConfigType
): RollupOptions => {
  let external = [];
  if (pkg.json.peerDependencies) {
    external.push(...Object.keys(pkg.json.peerDependencies));
  }
  if (pkg.json.dependencies && type !== "umd") {
    external.push(...Object.keys(pkg.json.dependencies));
  }

  if (type === "node-dev" || type === "node-prod") {
    external.push(...builtInModules);
  }

  let rollupAliases: Record<string, string> = {};

  Object.keys(aliases).forEach(key => {
    try {
      rollupAliases[key] = resolveFrom(pkg.directory, aliases[key]);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") {
        throw err;
      }
    }
  });

  let input: Record<string, string> = {};

  entrypoints.forEach(entrypoint => {
    input[
      path.relative(
        pkg.directory,
        path.join(entrypoint.directory, "dist", getNameForDist(pkg.name))
      )
    ] = entrypoint.source;
  });

  let warnings: Array<FatalError> = [];

  const config: RollupOptions = {
    input,
    external: makeExternalPredicate(external),
    onwarn: warning => {
      if (typeof warning === "string") {
        warnings.push(
          new FatalError(
            `An unhandled Rollup error occurred: ${chalk.red(
              warning.toString()
            )}`,
            pkg.name
          )
        );
        return;
      }
      switch (warning.code) {
        case "EMPTY_BUNDLE":
        case "CIRCULAR_DEPENDENCY":
        case "UNUSED_EXTERNAL_IMPORT": {
          break;
        }
        case "UNRESOLVED_IMPORT": {
          if (!warning.source!.startsWith(".")) {
            warnings.push(
              new FatalError(
                `"${warning.source}" is imported by "${path.relative(
                  pkg.directory,
                  warning.importer!
                )}" but the package is not specified in dependencies or peerDependencies`,
                pkg.name
              )
            );
            return;
          }
        }
        default: {
          warnings.push(
            new FatalError(
              `An unhandled Rollup error occurred: ${chalk.red(
                warning.toString()
              )}`,
              pkg.name
            )
          );
        }
      }
    },
    plugins: [
      {
        name: "throw-warnings",
        buildEnd() {
          if (warnings.length) {
            throw new BatchError(warnings);
          }
        }
      } as Plugin,
      type === "node-prod" && flowAndNodeDevProdEntry(pkg, warnings),
      type === "node-prod" && typescriptDeclarations(pkg),
      babel({
        cwd: pkg.project.directory,
        extensions: EXTENSIONS
      }),
      type === "umd" &&
        cjs({
          include: ["**/node_modules/**", "node_modules/**"]
        }),
      (type === "browser" || type === "umd") &&
        replace({
          ["typeof " + "document"]: JSON.stringify("object"),
          ["typeof " + "window"]: JSON.stringify("object")
        }),
      rewriteBabelRuntimeHelpers(),
      json({
        // @ts-ignore
        namedExports: false
      }),
      type === "umd" &&
        alias({
          entries: rollupAliases
        }),
      resolve({
        extensions: EXTENSIONS,
        customResolveOptions: {
          moduleDirectory: type === "umd" ? "node_modules" : []
        }
      }),
      (type === "umd" || type === "node-prod") &&
        replace({
          // tricking static analysis is fun...
          ["process" + ".env.NODE_ENV"]: '"production"'
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
