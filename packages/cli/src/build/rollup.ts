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
import mjsProxy from "../rollup-plugins/mjs-proxy";
import json from "@rollup/plugin-json";
import babel from "../rollup-plugins/babel";
import terser from "../rollup-plugins/terser";
import { getBaseDistName } from "../utils";
import { EXTENSIONS } from "../constants";
import { inlineProcessEnvNodeEnv } from "../rollup-plugins/inline-process-env-node-env";
import normalizePath from "normalize-path";
import { serverComponentsPlugin } from "../rollup-plugins/server-components";
import { resolveErrorsPlugin } from "../rollup-plugins/resolve";

type ExternalPredicate = (source: string) => boolean;

// this makes sure nested imports of external packages are external
const makeExternalPredicate = (externalArr: string[]): ExternalPredicate => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return (id: string) => pattern.test(id);
};

export type RollupConfigType =
  | "umd"
  | "browser"
  | "worker"
  | "node-dev"
  | "node-prod";

export let getRollupConfig = (
  pkg: Package,
  entrypoints: Array<Entrypoint>,
  aliases: Aliases,
  type: RollupConfigType,
  reportTransformedFile: (filename: string) => void
): RollupOptions => {
  let external = [];
  if (pkg.json.peerDependencies) {
    external.push(...Object.keys(pkg.json.peerDependencies));
  }
  if (pkg.json.dependencies && type !== "umd") {
    external.push(...Object.keys(pkg.json.dependencies));
  }
  external.push(pkg.name);

  let wrapExternalPredicate = (inner: ExternalPredicate): ExternalPredicate =>
    inner;

  if (type === "node-dev" || type === "node-prod") {
    external.push(...builtInModules);
    wrapExternalPredicate = (inner) => (source) =>
      source.startsWith("node:") || inner(source);
  }

  let input: Record<string, string> = {};

  entrypoints.forEach((entrypoint) => {
    input[
      path.relative(
        pkg.directory,
        path.join(entrypoint.directory, "dist", getBaseDistName(entrypoint))
      )
    ] = entrypoint.source;
  });

  let warnings = new Set<string>();

  const config: RollupOptions = {
    input,
    external: wrapExternalPredicate(makeExternalPredicate(external)),
    onwarn: (warning) => {
      if (typeof warning === "string") {
        warnings.add(
          `An unhandled Rollup error occurred: ${chalk.red(
            // @ts-ignore
            warning.toString()
          )}`
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
        case "THIS_IS_UNDEFINED": {
          if (type === "umd") {
            return;
          }
          warnings.add(
            `"${normalizePath(
              path.relative(pkg.directory, warning.loc!.file!)
            )}" used \`this\` keyword at the top level of an ES module. You can read more about this at ${warning.url!} and fix this issue that has happened here:\n\n${warning.frame!}\n`
          );
          return;
        }
        default: {
          warnings.add(
            `An unhandled Rollup error occurred: ${chalk.red(
              warning.toString()
            )}`
          );
        }
      }
    },
    plugins: [
      {
        name: "throw-warnings",
        buildEnd() {
          if (warnings.size) {
            throw new BatchError(
              [...warnings].map((x) => new FatalError(x, pkg.name))
            );
          }
        },
      } as Plugin,
      type === "node-prod" && flowAndNodeDevProdEntry(),
      resolveErrorsPlugin(pkg, warnings, type === "umd"),
      type === "node-prod" && typescriptDeclarations(pkg),
      type === "node-prod" &&
        pkg.exportsFieldConfig()?.importConditionDefaultExport === "default" &&
        mjsProxy(pkg),
      serverComponentsPlugin({ sourceMap: type === "umd" }),
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
      type === "umd" &&
        cjs({
          include: ["**/node_modules/**", "node_modules/**"],
        }),

      rewriteBabelRuntimeHelpers(),
      json({
        namedExports: false,
      }),
      type === "umd" &&
        alias({
          entries: aliases,
        }),
      resolve({
        extensions: EXTENSIONS,
        // only umd builds will actually load dependencies which is where this browser flag actually makes a difference
        browser: type === "umd",
        moduleDirectories: type === "umd" ? ["node_modules"] : [],
      }),
      type === "umd" && inlineProcessEnvNodeEnv({ sourceMap: true }),
      type === "umd" &&
        terser({
          sourceMap: true,
          compress: true,
        }),
      type === "node-prod" && inlineProcessEnvNodeEnv({ sourceMap: false }),
      (type === "browser" || type === "umd") &&
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
