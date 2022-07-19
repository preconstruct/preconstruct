import { Package } from "../package";
import { getRollupConfig } from "./rollup";
import { OutputOptions, OutputPlugin, RollupOptions } from "rollup";
import { Aliases } from "./aliases";
import { PKG_JSON_CONFIG_FIELD } from "../constants";
import { limit, doPromptInput } from "../prompt";
import path from "path";
import resolveFrom from "resolve-from";
import * as logger from "../logger";
import { Project } from "../project";

function getGlobal(project: Project, name: string) {
  if (
    project.json.preconstruct.globals !== undefined &&
    project.json.preconstruct.globals[name]
  ) {
    return project.json.preconstruct.globals[name];
  } else {
    try {
      let pkgJson = require(resolveFrom(
        project.directory,
        path.join(name, "package.json")
      ));
      if (
        pkgJson &&
        pkgJson[PKG_JSON_CONFIG_FIELD] &&
        pkgJson[PKG_JSON_CONFIG_FIELD].umdName
      ) {
        return pkgJson[PKG_JSON_CONFIG_FIELD].umdName;
      }
    } catch (err) {
      if (
        err.code !== "MODULE_NOT_FOUND" &&
        err.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED"
      ) {
        throw err;
      }
    }
    throw limit(() =>
      (async () => {
        // if while we were waiting, that global was added, return
        if (
          project.json.preconstruct.globals !== undefined &&
          project.json.preconstruct.globals[name]
        ) {
          return;
        }
        let response = await doPromptInput(
          `What should the umdName of ${name} be?`,
          project
        );
        if (!project.json.preconstruct.globals) {
          project.json.preconstruct.globals = {};
        }
        project.json.preconstruct.globals[name] = response;

        await project.save();
      })()
    );
  }
}

const babelHelperId = /@babel\/runtime(|-corejs[23])\/helpers\//;

const interop = (id: string | null): "auto" | "default" =>
  id && babelHelperId.test(id) ? "default" : "auto";

export function getRollupConfigs(pkg: Package, aliases: Aliases) {
  const cjsPlugins: OutputPlugin[] = pkg.project.experimentalFlags
    .keepDynamicImportAsDynamicImportInCommonJS
    ? [
        {
          name: "cjs render dynamic import",
          renderDynamicImport() {
            return {
              left: "import(",
              right: ")",
            };
          },
        },
      ]
    : [];

  let configs: Array<{
    config: RollupOptions;
    outputs: OutputOptions[];
  }> = [];

  const hasModuleType = pkg.type === "module";
  let hasModuleField = pkg.entrypoints[0].json.module !== undefined;
  configs.push({
    config: getRollupConfig(
      pkg,
      pkg.entrypoints,
      aliases,
      "node-dev",
      pkg.project.experimentalFlags.logCompiledFiles
        ? (filename) => {
            logger.info(
              "compiled " +
                filename.replace(pkg.project.directory + path.sep, "")
            );
          }
        : () => {}
    ),
    outputs: [
      ...(!hasModuleType
        ? [
            {
              format: "cjs" as const,
              entryFileNames: "[name].cjs.dev.js",
              chunkFileNames: "dist/[name]-[hash].cjs.dev.js",
              dir: pkg.directory,
              exports: "named" as const,
              interop,
              plugins: cjsPlugins,
            },
          ]
        : []),
      ...(hasModuleField || hasModuleType
        ? [
            {
              format: "es" as const,
              entryFileNames: "[name].esm.js",
              chunkFileNames: "dist/[name]-[hash].esm.js",
              dir: pkg.directory,
            },
          ]
        : []),
    ],
  });

  if (!hasModuleType)
    configs.push({
      config: getRollupConfig(
        pkg,
        pkg.entrypoints,
        aliases,
        "node-prod",
        () => {}
      ),
      outputs: [
        {
          format: "cjs",
          entryFileNames: "[name].cjs.prod.js",
          chunkFileNames: "dist/[name]-[hash].cjs.prod.js",
          dir: pkg.directory,
          exports: "named",
          interop,
          plugins: cjsPlugins,
        },
      ],
    });

  // umd builds are a bit special
  // we don't guarantee that shared modules are shared across umd builds
  // this is just like dependencies, they're bundled into the umd build
  if (pkg.entrypoints[0].json["umd:main"] !== undefined)
    pkg.entrypoints.forEach((entrypoint) => {
      configs.push({
        config: getRollupConfig(pkg, [entrypoint], aliases, "umd", () => {}),
        outputs: [
          {
            format: "umd" as const,
            sourcemap: true,
            entryFileNames: "[name].umd.min.js",
            name: entrypoint.json.preconstruct.umdName as string,
            dir: pkg.directory,
            interop,
            globals: (name: string) => {
              if (name === (entrypoint.json.preconstruct.umdName as string)) {
                return name;
              }
              return getGlobal(pkg.project, name);
            },
          },
        ],
      });
    });

  const exportsFieldConfig = pkg.exportsFieldConfig();

  let hasBrowserField = pkg.entrypoints[0].json.browser !== undefined;

  if (hasBrowserField) {
    configs.push({
      config: getRollupConfig(
        pkg,
        pkg.entrypoints,
        aliases,
        "browser",
        () => {}
      ),
      outputs: [
        !exportsFieldConfig &&
          !hasModuleType && {
            format: "cjs" as const,
            entryFileNames: "[name].browser.cjs.js",
            chunkFileNames: "dist/[name]-[hash].browser.cjs.js",
            dir: pkg.directory,
            exports: "named" as const,
            interop,
            plugins: cjsPlugins,
          },
        (hasModuleField || hasModuleType) && {
          format: "es" as const,
          entryFileNames: "[name].browser.esm.js",
          chunkFileNames: "dist/[name]-[hash].browser.esm.js",
          dir: pkg.directory,
        },
      ].filter(
        (value): value is Exclude<typeof value, false> => value !== false
      ),
    });
  }

  // TODO: Not sure this is the case anymore with `"type": "module"`
  // note module builds always exist when using the exports field
  if (exportsFieldConfig?.envConditions.has("worker")) {
    configs.push({
      config: getRollupConfig(
        pkg,
        pkg.entrypoints,
        aliases,
        "worker",
        () => {}
      ),
      outputs: [
        {
          format: "es" as const,
          entryFileNames: "[name].worker.esm.js",
          chunkFileNames: "dist/[name]-[hash].worker.esm.js",
          dir: pkg.directory,
        },
      ],
    });
  }

  return configs;
}
