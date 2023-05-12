import { Package } from "../package";
import { getRollupConfig } from "./rollup";
import { OutputOptions, RollupOptions } from "rollup";
import { PKG_JSON_CONFIG_FIELD } from "../constants";
import { limit, doPromptInput } from "../prompt";
import path from "path";
import resolveFrom from "resolve-from";
import * as logger from "../logger";
import { Project } from "../project";
import { getDistExtension, getDistExtensionForConditions } from "../utils";

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

export function getRollupConfigs(pkg: Package) {
  let configs: Array<{
    config: RollupOptions;
    outputs: OutputOptions[];
  }> = umdBuilds(pkg);

  const exportsFieldConfig = pkg.exportsFieldConfig();

  if (exportsFieldConfig?.conditions.kind === "imports") {
    for (const conditions of exportsFieldConfig.conditions.groups.keys()) {
      configs.push({
        config: getRollupConfig(
          pkg,
          pkg.entrypoints,
          { kind: "conditions", conditions },
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
          {
            format: "cjs" as const,
            entryFileNames: `[name].${getDistExtensionForConditions(
              conditions
            )}`,
            chunkFileNames: `dist/[name]-[hash].${getDistExtensionForConditions(
              conditions
            )}`,
            dir: pkg.directory,
            exports: "named" as const,
            interop,
          },
          {
            format: "es" as const,
            entryFileNames: `[name].${getDistExtensionForConditions(
              conditions.concat("module")
            )}`,
            chunkFileNames: `dist/[name]-[hash].${getDistExtensionForConditions(
              conditions.concat("module")
            )}`,
            dir: pkg.directory,
          },
        ],
      });
    }
    return configs;
  }

  let hasModuleField = pkg.entrypoints[0].json.module !== undefined;
  configs.push({
    config: getRollupConfig(
      pkg,
      pkg.entrypoints,
      { kind: "node-dev" },
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
      {
        format: "cjs" as const,
        entryFileNames: "[name].cjs.dev.js",
        chunkFileNames: "dist/[name]-[hash].cjs.dev.js",
        dir: pkg.directory,
        exports: "named" as const,
        interop,
      },
      ...(hasModuleField
        ? [
            {
              format: "es" as const,
              entryFileNames: `[name].${getDistExtension("esm")}`,
              chunkFileNames: `dist/[name]-[hash].${getDistExtension("esm")}`,
              dir: pkg.directory,
            },
          ]
        : []),
    ],
  });

  configs.push({
    config: getRollupConfig(
      pkg,
      pkg.entrypoints,
      { kind: "node-prod" },
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
      },
    ],
  });

  let hasBrowserField = pkg.entrypoints[0].json.browser !== undefined;

  if (hasBrowserField) {
    configs.push({
      config: getRollupConfig(
        pkg,
        pkg.entrypoints,
        { kind: "browser" },
        () => {}
      ),
      outputs: [
        !exportsFieldConfig && {
          format: "cjs" as const,
          entryFileNames: `[name].${getDistExtension("browser-cjs")}`,
          chunkFileNames: `dist/[name]-[hash].${getDistExtension(
            "browser-cjs"
          )}`,
          dir: pkg.directory,
          exports: "named" as const,
          interop,
        },
        hasModuleField && {
          format: "es" as const,
          entryFileNames: `[name].${getDistExtension("browser-esm")}`,
          chunkFileNames: `dist/[name]-[hash].${getDistExtension(
            "browser-esm"
          )}`,
          dir: pkg.directory,
        },
      ].filter(
        (value): value is Exclude<typeof value, false> => value !== false
      ),
    });
  }

  // note module builds always exist when using the exports field
  if (
    exportsFieldConfig?.conditions.kind === "legacy" &&
    exportsFieldConfig?.conditions.envs.has("worker")
  ) {
    configs.push({
      config: getRollupConfig(
        pkg,
        pkg.entrypoints,
        { kind: "worker" },
        () => {}
      ),
      outputs: [
        {
          format: "es" as const,
          entryFileNames: `[name].${getDistExtension("worker")}`,
          chunkFileNames: `dist/[name]-[hash].${getDistExtension("worker")}`,
          dir: pkg.directory,
        },
      ],
    });
  }

  return configs;
}

function umdBuilds(
  pkg: Package
): Array<{
  config: RollupOptions;
  outputs: OutputOptions[];
}> {
  // umd builds are a bit special
  // we don't guarantee that shared modules are shared across umd builds
  // this is just like dependencies, they're bundled into the umd build
  if (pkg.entrypoints[0].json["umd:main"] !== undefined)
    return pkg.entrypoints.map((entrypoint) => {
      return {
        config: getRollupConfig(pkg, [entrypoint], { kind: "umd" }, () => {}),
        outputs: [
          {
            format: "umd" as const,
            sourcemap: true,
            entryFileNames: `[name].${getDistExtension("umd")}`,
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
      };
    });
  return [];
}
