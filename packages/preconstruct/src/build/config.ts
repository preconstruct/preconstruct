// @flow
import { Package } from "../package";
import { getRollupConfig } from "./rollup";
import { OutputOptions, RollupOptions } from "rollup";
import { Aliases } from "./aliases";

function getGlobals(pkg: Package) {
  let stuff = [];

  if (pkg.peerDependencies) {
    stuff.push(...Object.keys(pkg.peerDependencies));
  }
  if (pkg.dependencies) {
    stuff.push(...Object.keys(pkg.dependencies));
  }

  if (stuff.length === 0) {
    return {};
  }

  let peerDeps = pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : [];

  return peerDeps.reduce(
    (obj, pkgName) => {
      obj[pkgName] = pkg.project.global(pkgName);
      return obj;
    },
    {} as Record<string, string>
  );
}

export function getRollupConfigs(pkg: Package, aliases: Aliases) {
  let configs: Array<{
    config: RollupOptions;
    outputs: OutputOptions[];
  }> = [];

  let strictEntrypoints = pkg.entrypoints.map(x => x.strict());

  let hasModuleField = strictEntrypoints[0].module !== null;

  configs.push({
    config: getRollupConfig(pkg, strictEntrypoints, aliases, "node-dev"),
    outputs: [
      {
        format: "cjs" as const,
        entryFileNames: "[name].cjs.dev.js",
        chunkFileNames: "dist/[name]-[hash].cjs.dev.js",
        dir: pkg.directory,
        exports: "named" as const
      },
      ...(hasModuleField
        ? [
            {
              format: "es" as const,
              entryFileNames: "[name].esm.js",
              chunkFileNames: "dist/[name]-[hash].esm.js",
              dir: pkg.directory
            }
          ]
        : [])
    ]
  });

  configs.push({
    config: getRollupConfig(pkg, strictEntrypoints, aliases, "node-prod"),
    outputs: [
      {
        format: "cjs",
        entryFileNames: "[name].cjs.prod.js",
        chunkFileNames: "dist/[name]-[hash].cjs.prod.js",
        dir: pkg.directory,
        exports: "named"
      }
    ]
  });

  // umd builds are a bit special
  // we don't guarantee that shared modules are shared across umd builds
  // this is just like dependencies, they're bundled into the umd build
  if (strictEntrypoints[0].umdMain !== null)
    pkg.entrypoints
      .map(x => x.strict())
      .forEach(entrypoint => {
        configs.push({
          config: getRollupConfig(pkg, [entrypoint], aliases, "umd"),
          outputs: [
            {
              format: "umd" as const,
              sourcemap: true,
              entryFileNames: "[name].umd.min.js",
              name: entrypoint.umdName!,
              dir: pkg.directory,
              globals: getGlobals(pkg)
            }
          ]
        });
      });

  let hasBrowserField = strictEntrypoints[0].browser !== null;

  if (hasBrowserField) {
    configs.push({
      config: getRollupConfig(pkg, strictEntrypoints, aliases, "browser"),
      outputs: [
        {
          format: "cjs" as const,
          entryFileNames: "[name].browser.cjs.js",
          chunkFileNames: "dist/[name]-[hash].browser.cjs.js",
          dir: pkg.directory,
          exports: "named" as const
        },
        ...(hasModuleField
          ? [
              {
                format: "es" as const,
                entryFileNames: "[name].browser.esm.js",
                chunkFileNames: "dist/[name]-[hash].browser.esm.js",
                dir: pkg.directory
              }
            ]
          : [])
      ]
    });
  }

  return configs;
}
