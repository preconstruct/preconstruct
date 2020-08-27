import { Package } from "../package";
import { getRollupConfig } from "./rollup";
import { OutputOptions, RollupOptions } from "rollup";
import { Aliases } from "./aliases";
import { PKG_JSON_CONFIG_FIELD } from "../constants";
import { limit, doPromptInput } from "../prompt";
import path from "path";
import resolveFrom from "resolve-from";
import * as logger from "../logger";
import { Project } from "../project";

function getGlobal(project: Project, name: string) {
  if (project._config.globals !== undefined && project._config.globals[name]) {
    return project._config.globals[name];
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
      if (err.code !== "MODULE_NOT_FOUND") {
        throw err;
      }
    }
    throw limit(() =>
      (async () => {
        // if while we were waiting, that global was added, return
        if (
          project._config.globals !== undefined &&
          project._config.globals[name]
        ) {
          return;
        }
        let response = await doPromptInput(
          `What should the umdName of ${name} be?`,
          project
        );
        if (!project._config.globals) {
          project._config.globals = {};
        }
        project._config.globals[name] = response;

        await project.save();
      })()
    );
  }
}

export function getRollupConfigs(pkg: Package, aliases: Aliases) {
  let configs: Array<{
    config: RollupOptions;
    outputs: OutputOptions[];
  }> = [];

  let strictEntrypoints = pkg.entrypoints.map((x) => x.strict());

  let hasModuleField = strictEntrypoints[0].module !== null;
  configs.push({
    config: getRollupConfig(
      pkg,
      strictEntrypoints,
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
      {
        format: "cjs" as const,
        entryFileNames: "[name].cjs.dev.js",
        chunkFileNames: "dist/[name]-[hash].cjs.dev.js",
        dir: pkg.directory,
        exports: "named" as const,
        interop: "auto",
      },
      ...(hasModuleField
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

  configs.push({
    config: getRollupConfig(
      pkg,
      strictEntrypoints,
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
        interop: "auto",
      },
    ],
  });

  // umd builds are a bit special
  // we don't guarantee that shared modules are shared across umd builds
  // this is just like dependencies, they're bundled into the umd build
  if (strictEntrypoints[0].umdMain !== null)
    pkg.entrypoints
      .map((x) => x.strict())
      .forEach((entrypoint) => {
        configs.push({
          config: getRollupConfig(pkg, [entrypoint], aliases, "umd", () => {}),
          outputs: [
            {
              format: "umd" as const,
              sourcemap: true,
              entryFileNames: "[name].umd.min.js",
              name: entrypoint.umdName!,
              dir: pkg.directory,
              interop: "auto",
              globals: (name: string) => {
                if (name === entrypoint.umdName!) {
                  return name;
                }
                return getGlobal(pkg.project, name);
              },
            },
          ],
        });
      });

  let hasBrowserField = strictEntrypoints[0].browser !== null;

  if (hasBrowserField) {
    configs.push({
      config: getRollupConfig(
        pkg,
        strictEntrypoints,
        aliases,
        "browser",
        () => {}
      ),
      outputs: [
        {
          format: "cjs" as const,
          entryFileNames: "[name].browser.cjs.js",
          chunkFileNames: "dist/[name]-[hash].browser.cjs.js",
          dir: pkg.directory,
          exports: "named" as const,
          interop: "auto",
        },
        ...(hasModuleField
          ? [
              {
                format: "es" as const,
                entryFileNames: "[name].browser.esm.js",
                chunkFileNames: "dist/[name]-[hash].browser.esm.js",
                dir: pkg.directory,
              },
            ]
          : []),
      ],
    });
  }

  return configs;
}
