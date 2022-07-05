import resolve from "@rollup/plugin-node-resolve";
// @ts-ignore
import alias from "@rollup/plugin-alias";
import cjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import chalk from "chalk";
import path from "path";
import builtInModules from "builtin-modules";
import { Package } from "../package";
import { Entrypoint } from "../entrypoint";
import { RollupOptions, Plugin } from "rollup";
import { Aliases } from "./aliases";
import { FatalError, BatchError } from "../errors";
import rewriteBabelRuntimeHelpers from "../rollup-plugins/rewrite-babel-runtime-helpers";
import flowAndNodeDevProdEntry from "../rollup-plugins/flow-and-prod-dev-entry";
import typescriptDeclarations from "../rollup-plugins/typescript-declarations";
import json from "@rollup/plugin-json";
import babel from "../rollup-plugins/babel";
import terser from "../rollup-plugins/terser";
import { getNameForDistForEntrypoint } from "../utils";
import { EXTENSIONS } from "../constants";
import { inlineProcessEnvNodeEnv } from "../rollup-plugins/inline-process-env-node-env";
import normalizePath from "normalize-path";

// this makes sure nested imports of external packages are external
const makeExternalPredicate = (externalArr: string[]) => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return (id: string) => pattern.test(id);
};

export type RollupConfigEnvironment = "dev" | "prod" | "umd";

export type RollupConfigType = "browser" | "node" | "worker";

export let getRollupConfig = (
  pkg: Package,
  entrypoints: Array<Entrypoint>,
  aliases: Aliases,
  type: RollupConfigType,
  env: RollupConfigEnvironment,
  reportTransformedFile: (filename: string) => void
): RollupOptions => {
  let external = [];
  if (pkg.json.peerDependencies) {
    external.push(...Object.keys(pkg.json.peerDependencies));
  }
  if (pkg.json.dependencies && env !== "umd") {
    external.push(...Object.keys(pkg.json.dependencies));
  }

  if (type === "node") {
    external.push(...builtInModules);
  }

  let input: Record<string, string> = {};

  entrypoints.forEach((entrypoint) => {
    input[
      path.relative(
        pkg.directory,
        path.join(
          entrypoint.directory,
          "dist",
          getNameForDistForEntrypoint(entrypoint)
        )
      )
    ] = entrypoint.source;
  });

  let warnings: Array<FatalError> = [];

  const config: RollupOptions = {
    input,
    external: makeExternalPredicate(external),
    onwarn: (warning) => {
      if (typeof warning === "string") {
        warnings.push(
          new FatalError(
            `An unhandled Rollup error occurred: ${chalk.red(
              // @ts-ignore
              warning.toString()
            )}`,
            pkg.name
          )
        );
        return;
      }
      switch (warning.code) {
        case "CIRCULAR_DEPENDENCY":
        case "EMPTY_BUNDLE":
        case "EVAL":
        case "UNUSED_EXTERNAL_IMPORT": {
          break;
        }
        case "UNRESOLVED_IMPORT": {
          if (!warning.source!.startsWith(".")) {
            warnings.push(
              new FatalError(
                `"${warning.source}" is imported by "${normalizePath(
                  path.relative(pkg.directory, warning.importer!)
                )}" but the package is not specified in dependencies or peerDependencies`,
                pkg.name
              )
            );
            return;
          }
        }
        case "THIS_IS_UNDEFINED": {
          if (env === "umd") {
            return;
          }
          warnings.push(
            new FatalError(
              `"${normalizePath(
                path.relative(pkg.directory, warning.loc!.file!)
              )}" used \`this\` keyword at the top level of an ES module. You can read more about this at ${warning.url!} and fix this issue that has happened here:\n\n${warning.frame!}\n`,
              pkg.name
            )
          );
          return;
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
        },
      } as Plugin,
      env === "prod" && flowAndNodeDevProdEntry(pkg, warnings),
      env === "prod" && typescriptDeclarations(pkg),
      babel({
        cwd: pkg.project.directory,
        reportTransformedFile,
        babelRuntime: (() => {
          for (const dep of [
            "@babel/runtime",
            "@babel/runtime-corejs2",
            "@babel/runtime-corejs3",
          ]) {
            const range = pkg.json.dependencies?.[dep];
            if (range !== undefined) {
              return { range, name: dep };
            }
          }
        })(),
      }),
      env === "umd" &&
        cjs({
          include: ["**/node_modules/**", "node_modules/**"],
        }),

      rewriteBabelRuntimeHelpers(),
      json({
        namedExports: false,
      }),
      env === "umd" &&
        alias({
          entries: aliases,
        }),
      resolve({
        extensions: EXTENSIONS,
        browser: type === "browser" || type === "worker",
        customResolveOptions: {
          moduleDirectory: env === "umd" ? "node_modules" : [],
        },
      }),
      env === "umd" && inlineProcessEnvNodeEnv({ sourceMap: true }),
      env === "umd" &&
        terser({
          sourceMap: true,
          compress: true,
        }),
      env === "prod" && inlineProcessEnvNodeEnv({ sourceMap: false }),
      type === "browser" &&
        replace({
          values: {
            ["typeof " + "document"]: JSON.stringify("object"),
            ["typeof " + "window"]: JSON.stringify("object"),
          },
          preventAssignment: true,
        }),
      type === "worker" &&
        replace({
          values: {
            ["typeof " + "document"]: JSON.stringify("undefined"),
            ["typeof " + "window"]: JSON.stringify("undefined"),
          },
          preventAssignment: true,
        }),
    ].filter((x): x is Plugin => !!x),
  };

  return config;
};
