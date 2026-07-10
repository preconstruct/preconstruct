import resolve from "@rollup/plugin-node-resolve";
// @ts-ignore
import alias from "@rollup/plugin-alias";
import cjs from "@rollup/plugin-commonjs";
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
import terser from "../rollup-plugins/terser";
import { getBaseDistName } from "../utils";
import { EXTENSIONS } from "../constants";
import normalizePath from "normalize-path";
import { serverComponentsPlugin } from "../rollup-plugins/server-components";
import { resolveErrorsPlugin } from "../rollup-plugins/resolve";
import { Project } from "../project";
import flow from "../rollup-plugins/flow";
import { codeFrameColumns } from "@babel/code-frame";

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
      preferBuiltinFeature: false,
    },
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
              [...warnings].map((x) => new FatalError(x, pkg.name))
            );
          }
        },
      } as Plugin,
      {
        name: "top-level-this",
        transform(code, id) {
          if (
            id.startsWith("\0") ||
            !id.startsWith(pkg.directory) ||
            id.includes(`${path.sep}node_modules${path.sep}`) ||
            code.includes("@flow") ||
            !/\.jsx?$/.test(id)
          )
            return null;
          const ast = this.parse(code);
          const thisExpression = findTopLevelThis(ast);
          if (thisExpression === undefined) return null;
          const before = code.slice(0, thisExpression.start);
          const line = before.split("\n").length;
          const column = thisExpression.start - before.lastIndexOf("\n");
          warnings.add(
            `"${normalizePath(
              path.relative(pkg.directory, id)
            )}" used \`this\` keyword at the top level of an ES module. You can read more about this at https://rollupjs.org/guide/en/#error-this-is-undefined and fix this issue that has happened here:\n\n${codeFrameColumns(
              code,
              { start: { line, column } },
              { linesAbove: 0, linesBelow: 0 }
            )}\n`
          );
          return null;
        },
      } as Plugin,
      (options.kind === "node" || isDefaultConditionsBuild) && flow(),
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
      options.kind === "umd" &&
        cjs({
          include: ["**/node_modules/**", "node_modules/**"],
        }),

      rewriteBabelRuntimeHelpers(),
      options.kind === "umd" &&
        alias({
          entries: getAliases(pkg.project),
        }),
      resolve({
        extensions: EXTENSIONS,
        exportConditions:
          options.kind === "conditions" ? options.conditions : undefined,
        // only umd builds will actually load dependencies which is where this browser flag actually makes a difference
        browser: options.kind === "umd",
        moduleDirectories: options.kind === "umd" ? ["node_modules"] : [],
      }),
      options.kind === "umd" &&
        terser({
          sourceMap: true,
          compress: true,
        }),
    ].filter((x): x is Plugin => !!x),
  };

  return config;
};

function getAliases(
  project: Project
): Array<{ find: RegExp; replacement: string }> {
  let aliases: Array<{ find: RegExp; replacement: string }> = [];
  project.packages.forEach((pkg) => {
    // pkg.entrypoints are already expanded from the configured entrypoint globs
    // and sorted in Package.create() for deterministic package.json#exports
    // emission, so we preserve that same stable order here.
    pkg.entrypoints.forEach((entrypoint) => {
      aliases.push({
        find: new RegExp(`^${escapeForRegex(entrypoint.name)}$`),
        replacement: entrypoint.source,
      });
    });
  });
  return aliases;
}

function escapeForRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

function findTopLevelThis(value: unknown): { start: number } | undefined {
  if (value === null || typeof value !== "object") return;
  const node = value as { type?: string; start?: number };
  if (node.type === "ThisExpression" && node.start !== undefined) {
    return { start: node.start };
  }
  if (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  ) {
    return;
  }
  for (const child of Object.values(value)) {
    const found = findTopLevelThis(child);
    if (found !== undefined) return found;
  }
}
