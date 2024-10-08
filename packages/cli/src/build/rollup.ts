import resolve from "@rollup/plugin-node-resolve";
// @ts-ignore
import alias from "@rollup/plugin-alias";
import cjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import pc from "picocolors";
import path from "path";
import builtInModules from "builtin-modules";
import { Package } from "../package";
import { Entrypoint } from "../entrypoint";
import { RollupOptions, Plugin } from "rollup";
import { FatalError, BatchError } from "../errors";
import rewriteBabelRuntimeHelpers from "../rollup-plugins/rewrite-babel-runtime-helpers";
import nodeDevProdEntry from "../rollup-plugins/prod-dev-entry";
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
import { Project } from "../project";
import flow from "../rollup-plugins/flow";

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
  | "worker"
  | "node-dev"
  | "node-prod";

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
): RollupOptions => {
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
    options.kind === "node-dev" ||
    options.kind === "node-prod" ||
    options.kind === "conditions"
  ) {
    external.push(...builtInModules);
    wrapExternalPredicate = (inner) => (source) =>
      source.startsWith("node:") || inner(source);
  }

  let input: Record<string, string> = {};
  const { distInRoot } = pkg.project.experimentalFlags;
  for (const entrypoint of entrypoints) {
    if (distInRoot) {
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

  const config: RollupOptions = {
    input,
    external: wrapExternalPredicate(makeExternalPredicate(external)),
    onwarn: (warning) => {
      if (typeof warning === "string") {
        warnings.add(
          `An unhandled Rollup error occurred: ${pc.red(
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
            `An unhandled Rollup error occurred: ${pc.red(warning.toString())}`
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
      options.kind === "node-prod" && nodeDevProdEntry(),
      (options.kind === "node-prod" || isDefaultConditionsBuild) && flow(),
      resolveErrorsPlugin(pkg, warnings, options.kind === "umd"),
      (options.kind === "node-prod" || isDefaultConditionsBuild) &&
        typescriptDeclarations(pkg),
      (options.kind === "node-prod" || options.kind === "conditions") &&
        pkg.exportsFieldConfig()?.importConditionDefaultExport === "default" &&
        mjsProxy(pkg),
      serverComponentsPlugin({ sourceMap: options.kind === "umd" }),
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
      json({
        namedExports: false,
      }),
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
      options.kind === "umd" && inlineProcessEnvNodeEnv({ sourceMap: true }),
      options.kind === "umd" &&
        terser({
          sourceMap: true,
          compress: true,
        }),
      options.kind === "node-prod" &&
        inlineProcessEnvNodeEnv({ sourceMap: false }),
      (options.kind === "browser" || options.kind === "umd") &&
        replace({
          values: {
            ["typeof " + "document"]: JSON.stringify("object"),
            ["typeof " + "window"]: JSON.stringify("object"),
          },
          preventAssignment: true,
        }),
      options.kind === "worker" &&
        replace({
          values: {
            ["typeof " + "document"]: JSON.stringify("undefined"),
            ["typeof " + "window"]: JSON.stringify("undefined"),
          },
          preventAssignment: true,
        }),
      pkg.project.experimentalFlags
        .keepDynamicImportAsDynamicImportInCommonJS && cjsDynamicImportPlugin,
    ].filter((x): x is Plugin => !!x),
  };

  return config;
};

function getAliases(
  project: Project
): {
  [key: string]: string;
} {
  let aliases: { [key: string]: string } = {};
  project.packages.forEach((pkg) => {
    pkg.entrypoints.forEach((entrypoint) => {
      aliases[entrypoint.name] = entrypoint.source;
    });
  });
  return aliases;
}

const cjsDynamicImportPlugin: Plugin = {
  name: "cjs render dynamic import",
  renderDynamicImport({ format }) {
    if (format !== "cjs") return;
    return {
      left: "import(",
      right: ")",
    };
  },
};
