import chalk from "chalk";
import path from "path";
import builtInModules from "builtin-modules";
import { Package } from "../package";
import { Entrypoint } from "../entrypoint";
import type { RolldownOptions, Plugin } from "rolldown";
import { FatalError, BatchError } from "../errors";
import rewriteBabelRuntimeHelpers from "../rollup-plugins/rewrite-babel-runtime-helpers";
import typescriptDeclarations from "../rollup-plugins/typescript-declarations";
import mjsProxy from "../rollup-plugins/mjs-proxy";
import babel from "../rollup-plugins/babel";
import { getBaseDistName } from "../utils";
import { EXTENSIONS } from "../constants";
import normalizePath from "normalize-path";
import { serverComponentsPlugin } from "../rollup-plugins/server-components";
import { resolveErrorsPlugin } from "../rollup-plugins/resolve";
import { Project } from "../project";

type ExternalPredicate = (source: string) => boolean;

// this makes sure nested imports of external packages are external
const makeExternalPredicate = (externalArr: string[]): ExternalPredicate => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return (id: string) => pattern.test(id);
};

type BasicRollupConfigType =
  | "umd"
  | "browser"
  | "node";

export let getRollupConfig = (
  pkg: Package,
  entrypoints: Array<Entrypoint>,
  options:
    | { kind: BasicRollupConfigType }
    | {
        kind: "conditions";
        /** This should not include import, module or require, only the custom conditions specified in imports */
        conditions: string[];
      },
  reportTransformedFile: (filename: string) => void
): RolldownOptions => {
  let external = [];
  if (pkg.json.peerDependencies) {
    external.push(...Object.keys(pkg.json.peerDependencies));
  }
  if (pkg.json.dependencies && options.kind !== "umd") {
    external.push(...Object.keys(pkg.json.dependencies));
  }
  external.push(pkg.name);

  let wrapExternalPredicate = (inner: ExternalPredicate): ExternalPredicate =>
    inner;

  if (
    options.kind === "node" ||
    options.kind === "conditions"
  ) {
    external.push(...builtInModules);
    wrapExternalPredicate = (inner) => (source) =>
      source.startsWith("node:") || inner(source);
  }

  let input: Record<string, string> = {};
  const usesRootDist = pkg.usesRootDist();
  for (const entrypoint of entrypoints) {
    if (usesRootDist) {
      input[`dist/${getBaseDistName(entrypoint)}`] = entrypoint.source;
      continue;
    }
    input[
      path.relative(
        pkg.directory,
        path.join(entrypoint.directory, "dist", getBaseDistName(entrypoint))
      )
    ] = entrypoint.source;
  }

  let warnings = new Set<string>();
  const isDefaultConditionsBuild =
    options.kind === "conditions" && options.conditions.length === 0;

  const config: RolldownOptions = {
    cwd: pkg.directory,
    checks: {
      pluginTimings: false,
    },
    platform: options.kind === "conditions" ? "neutral" : undefined,
    resolve: {
      alias: getAliases(pkg.project),
      extensions: [...EXTENSIONS],
      conditionNames:
        options.kind === "conditions"
          ? [...options.conditions, "module", "import", "default"]
          : options.kind === "umd"
          ? ["browser", "module", "import", "default"]
          : undefined,
      aliasFields: options.kind === "umd" ? [["browser"]] : undefined,
      mainFields:
        options.kind === "umd" ? ["browser", "module", "main"] : undefined,
      modules: options.kind === "umd" ? ["node_modules"] : [],
    },
    transform:
      options.kind === "umd"
        ? {
            define: {
              "process.env.NODE_ENV": JSON.stringify("development"),
            },
          }
        : undefined,
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
          if (options.kind === "umd") {
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
              [...warnings].sort().map((x) => new FatalError(x, pkg.name))
            );
          }
        },
      } as Plugin,
      resolveErrorsPlugin(pkg, warnings, options.kind === "umd"),
      (options.kind === "node" || isDefaultConditionsBuild) &&
        typescriptDeclarations(pkg),
      (options.kind === "node" || options.kind === "conditions") &&
        pkg.exportsFieldConfig()?.importConditionDefaultExport === "default" &&
        mjsProxy(pkg),
      serverComponentsPlugin({
        sourceMap: options.kind === "umd",
        root: pkg.directory,
      }),
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
      rewriteBabelRuntimeHelpers(),
    ].filter((x): x is Plugin => !!x),
  };

  return config;
};

function getAliases(project: Project): Record<string, string> {
  let aliases: Record<string, string> = {};
  project.packages.forEach((pkg) => {
    // pkg.entrypoints are already expanded from the configured entrypoint globs
    // and sorted in Package.create() for deterministic package.json#exports
    // emission, so we preserve that same stable order here.
    pkg.entrypoints.forEach((entrypoint) => {
      aliases[entrypoint.name] = entrypoint.source;
    });
  });
  return aliases;
}
