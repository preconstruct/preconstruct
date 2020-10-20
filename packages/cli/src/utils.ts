import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import { Package } from "./package";
import * as nodePath from "path";
import { FatalError } from "../dist/declarations/src/errors";

export function getNameForDistForEntrypoint(entrypoint: Entrypoint): string {
  return getDistName(entrypoint.package, entrypoint.name);
}

let fields = [
  "version",
  "description",
  "main",
  "module",
  "umd:main",
  "browser",
];

export function setFieldInOrder<
  Obj extends { [key: string]: any },
  Key extends "main" | "module" | "umd:main" | "browser",
  Val extends any
>(obj: Obj, field: Key, value: Val): Obj & { [k in Key]: Val } {
  if (field in obj) {
    let newObj = { ...obj };
    (newObj as any)[field] = value;
    return newObj;
  }
  let fieldIndex = fields.indexOf(field);
  let idealField = fields
    .slice(0, fieldIndex)
    .reverse()
    .find((key) => {
      return key in obj;
    });

  if (idealField === undefined) {
    return { ...obj, [field]: value };
  }

  let newObj: { [key: string]: any } = {};

  for (let key in obj) {
    newObj[key] = obj[key];

    if (key === idealField) {
      newObj[field] = value;
    }
  }

  return newObj as any;
}

export function getEntrypointName(pkg: Package, entrypointDir: string) {
  return normalizePath(
    nodePath.join(
      pkg.name,
      nodePath.relative(
        pkg.directory,
        nodePath.resolve(pkg.directory, entrypointDir)
      )
    )
  );
}

type DistFilenameStrategy = "full" | "only-unscoped-package-name";

function getDistNameWithStrategy(
  pkg: Package,
  entrypointName: string,
  strategy: DistFilenameStrategy
) {
  if (strategy === "full") {
    return entrypointName.replace("@", "").replace(/\//g, "");
  }
  return pkg.name.replace(/.*\//, "");
}

function getDistName(
  pkg: Package,
  entrypointName: string,
  forceStrategy?: DistFilenameStrategy
): string {
  if (forceStrategy) {
    return getDistNameWithStrategy(pkg, entrypointName, forceStrategy);
  }
  if (pkg.project.experimentalFlags.newDistFilenames) {
    if ("distFilenameStrategy" in pkg.project.json.preconstruct) {
      if (
        pkg.project.json.preconstruct.distFilenameStrategy !== "full" &&
        pkg.project.json.preconstruct.distFilenameStrategy !==
          "only-unscoped-package-name"
      ) {
        throw new FatalError(
          `distFilenameStrategy is defined in your Preconstruct config as ${JSON.stringify(
            pkg.project.json.preconstruct.distFilenameStrategy
          )} but the only accepted values are "full" and "only-unscoped-package-name"`,
          pkg.project.name
        );
      }
      if (
        pkg.project.json.preconstruct.distFilenameStrategy ===
        "only-unscoped-package-name"
      ) {
        return getDistNameWithStrategy(
          pkg,
          entrypointName,
          "only-unscoped-package-name"
        );
      }
    }
    return getDistNameWithStrategy(pkg, entrypointName, "full");
  }
  return getDistNameWithStrategy(
    pkg,
    entrypointName,
    "only-unscoped-package-name"
  );
}

export const validFieldsFromPkg = {
  main(
    pkg: Package,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);
    return `dist/${safeName}.cjs.js`;
  },
  module(
    pkg: Package,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);
    return `dist/${safeName}.esm.js`;
  },
  "umd:main"(
    pkg: Package,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);
    return `dist/${safeName}.umd.min.js`;
  },
  browser(
    pkg: Package,
    hasModuleBuild: boolean,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);

    let obj = {
      [`./dist/${safeName}.cjs.js`]: `./dist/${safeName}.browser.cjs.js`,
    };
    if (hasModuleBuild) {
      obj[`./dist/${safeName}.esm.js`] = `./dist/${safeName}.browser.esm.js`;
    }
    return obj;
  },
};

export const validFields = {
  main(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg.main(
      entrypoint.package,
      entrypoint.name,
      forceStrategy
    );
  },
  module(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg.module(
      entrypoint.package,
      entrypoint.name,
      forceStrategy
    );
  },
  "umd:main"(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg["umd:main"](
      entrypoint.package,
      entrypoint.name,
      forceStrategy
    );
  },
  browser(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg.browser(
      entrypoint.package,
      entrypoint.json.module !== undefined,
      entrypoint.name,
      forceStrategy
    );
  },
};

export function flowTemplate(hasDefaultExport: boolean, relativePath: string) {
  const escapedPath = JSON.stringify(relativePath);
  return `// @flow
export * from ${escapedPath};${
    hasDefaultExport ? `\nexport { default } from ${escapedPath};` : ""
  }\n`;
}

export function tsTemplate(hasDefaultExport: boolean, relativePath: string) {
  const escapedPath = JSON.stringify(relativePath);
  return `export * from ${escapedPath};${
    hasDefaultExport ? `\nexport { default } from ${escapedPath};` : ""
  }\n`;
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | Array<JSONValue>
  | { [key: string]: JSONValue | undefined };
