// @flow
import { Package } from "../package";
import { StrictEntrypoint } from "../entrypoint";
import path from "path";
import { type RollupConfig, getRollupConfig } from "./rollup";
import type { OutputOptions } from "./types";
import type { Aliases } from "./aliases";
import is from "sarcastic";
import {
  getValidCjsBrowserPath,
  getValidModuleBrowserPath,
  getValidCjsReactNativePath,
  getValidModuleReactNativePath
} from "../utils";
import { getDevPath, getProdPath } from "./utils";
import resolveFrom from "resolve-from";

let unsafeRequire = require;

function getChildDeps(
  finalPeerDeps: Array<string>,
  depKeys: Array<string>,
  doneDeps: Array<string>,
  aliases: Aliases,
  pkg: Package
) {
  depKeys
    .filter(x => !doneDeps.includes(x))
    .forEach(key => {
      let pkgJson = unsafeRequire(
        resolveFrom(pkg.directory, key + "/package.json")
      );

      if (pkgJson.peerDependencies) {
        finalPeerDeps.push(...Object.keys(pkgJson.peerDependencies));
      }
      if (pkgJson.dependencies) {
        doneDeps.push(...Object.keys(pkgJson.dependencies));
        getChildDeps(
          finalPeerDeps,
          Object.keys(pkgJson.dependencies),
          doneDeps,
          aliases,
          pkg
        );
      }
    });
}

function getGlobals(pkg: Package, aliases) {
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

  let finalPeerDeps = pkg.peerDependencies
    ? Object.keys(pkg.peerDependencies)
    : [];

  getChildDeps(finalPeerDeps, stuff, [], aliases, pkg);

  return finalPeerDeps.reduce((obj, pkgName) => {
    obj[pkgName] = pkg.project.global(pkgName);
    return obj;
  }, {});
}

function replaceThing(
  pkg: Package,
  entrypoints: Array<StrictEntrypoint>,
  getOutputPath: StrictEntrypoint => string
) {
  let counter = 0;
  let outputFiles = entrypoints.map(entrypoint =>
    path.relative(
      pkg.directory,
      path.join(entrypoint.directory, getOutputPath(entrypoint))
    )
  );
  return {
    replace() {
      return outputFiles[counter];
    }
  };
}

export function getRollupConfigs(pkg: Package, aliases: Aliases) {
  let configs: Array<{
    config: RollupConfig,
    outputs: Array<OutputOptions>
  }> = [];

  configs.push({
    config: getRollupConfig(
      pkg,
      pkg.entrypoints.map(x => x.strict()),
      aliases,
      "node-dev"
    ),
    outputs: [
      {
        format: "cjs",
        entryFileNames: replaceThing(
          pkg,
          pkg.entrypoints.map(x => x.strict()),
          entrypoint => getDevPath(entrypoint.main)
        ),
        chunkFileNames: "dist/[name]-[hash].cjs.dev.js",
        dir: pkg.directory,
        exports: "named"
      }
      // ...(entry.module
      //   ? [
      //       {
      //         format: "es",
      //         entryFileNames: replaceThing(pkg, entrypoint =>
      //           getDevPath(entrypoint.module)
      //         ),
      //         chunkFileNames: "dist/[name]-[hash].esm.js",
      //         dir: pkg.directory
      //       }
      //     ]
      //   : [])
    ]
  });
  // TODO: optimise for the case that all entrypoints have module builds(this will be 99% of cases)
  let entrypointsWithModule = pkg.entrypoints
    .map(x => x.strict())
    .filter(x => x.module);

  if (entrypointsWithModule.length) {
    configs.push({
      config: getRollupConfig(pkg, entrypointsWithModule, aliases, "node-dev"),
      outputs: [
        {
          format: "es",
          entryFileNames: replaceThing(pkg, entrypointsWithModule, entrypoint =>
            is(entrypoint.module, is.string)
          ),
          chunkFileNames: "dist/[name]-[hash].esm.js",
          dir: pkg.directory
        }
      ]
    });
  }

  configs.push({
    config: getRollupConfig(
      pkg,
      pkg.entrypoints.map(x => x.strict()),
      aliases,
      "node-prod"
    ),
    outputs: [
      {
        format: "cjs",
        entryFileNames: replaceThing(
          pkg,
          pkg.entrypoints.map(x => x.strict()),
          entrypoint => getProdPath(entrypoint.main)
        ),
        chunkFileNames: "dist/[name]-[hash].cjs.prod.js",
        dir: pkg.directory,
        exports: "named"
      }
    ]
  });

  // umd builds are a bit special
  // we don't guarantee that shared modules are shared across umd builds
  // this is just like dependencies, they're bundled into the umd build
  pkg.entrypoints
    .filter(x => x.umdMain)
    .map(x => x.strict())
    .forEach(entrypoint => {
      let umdName = is(entrypoint._config.umdName, is.string);
      let umdMain = is(entrypoint.umdMain, is.string);

      configs.push({
        config: getRollupConfig(pkg, [entrypoint], aliases, "umd"),
        outputs: [
          {
            format: "umd",
            sourcemap: true,
            file: path.join(entrypoint.directory, umdMain),
            name: umdName,
            globals: getGlobals(pkg, aliases)
          }
        ]
      });
    });
  let entrypointsWithBrowser = pkg.entrypoints
    .map(x => x.strict())
    .filter(x => x.browser);

  if (entrypointsWithBrowser.length) {
    // i just realised that we're making the assumption that if you have a browser build
    // you also have a module build. I feel like this is probably a safe assumption
    // but might want to think about more.

    configs.push({
      config: getRollupConfig(pkg, entrypointsWithBrowser, aliases, "browser"),
      outputs: [
        {
          format: "cjs",
          entryFileNames: replaceThing(
            pkg,
            entrypointsWithBrowser,
            entrypoint => getValidCjsBrowserPath(entrypoint)
          ),
          chunkFileNames: "dist/[name]-[hash].browser.cjs.js",
          dir: pkg.directory,
          exports: "named"
        },
        {
          format: "es",
          entryFileNames: replaceThing(
            pkg,
            entrypointsWithBrowser,
            entrypoint => getValidModuleBrowserPath(entrypoint)
          ),
          chunkFileNames: "dist/[name]-[hash].browser.esm.js",
          dir: pkg.directory
        }
      ]
    });
  }
  let entrypointsWithReactNative = pkg.entrypoints
    .map(x => x.strict())
    .filter(x => x.reactNative);
  // TODO: remove this and do the end result with entrypoint stuff maybe
  if (entrypointsWithReactNative.length) {
    configs.push({
      config: getRollupConfig(pkg, entrypointsWithBrowser, aliases, "browser"),
      outputs: [
        {
          format: "cjs",
          entryFileNames: replaceThing(
            pkg,
            entrypointsWithBrowser,
            entrypoint => getValidCjsReactNativePath(entrypoint)
          ),
          chunkFileNames: "dist/[name]-[hash].native.cjs.js",
          dir: pkg.directory,
          exports: "named"
        },
        {
          format: "es",
          entryFileNames: replaceThing(
            pkg,
            entrypointsWithBrowser,
            entrypoint => getValidModuleReactNativePath(entrypoint)
          ),
          chunkFileNames: "dist/[name]-[hash].native.esm.js",
          dir: pkg.directory
        }
      ]
    });
  }
  return configs;
}
