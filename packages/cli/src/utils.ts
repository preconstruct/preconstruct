import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import { Package, ExportsConditions } from "./package";
import * as nodePath from "path";
import { FatalError } from "./errors";

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
  "exports",
];

export function setFieldInOrder<
  Obj extends { [key: string]: any },
  Key extends "main" | "module" | "umd:main" | "browser" | "exports",
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

type DistFilenameStrategy = "full" | "unscoped-package-name";

function getDistNameWithStrategy(
  pkg: Package,
  entrypointName: string,
  strategy: DistFilenameStrategy
) {
  if (strategy === "full") {
    return entrypointName.replace("@", "").replace(/\//g, "-");
  }
  return pkg.name.replace(/.*\//, "");
}

function getDistName(pkg: Package, entrypointName: string): string {
  if ("distFilenameStrategy" in pkg.project.json.preconstruct) {
    if (
      pkg.project.json.preconstruct.distFilenameStrategy !== "full" &&
      pkg.project.json.preconstruct.distFilenameStrategy !==
        "unscoped-package-name"
    ) {
      throw new FatalError(
        `distFilenameStrategy is defined in your Preconstruct config as ${JSON.stringify(
          pkg.project.json.preconstruct.distFilenameStrategy
        )} but the only accepted values are "full" and "unscoped-package-name"`,
        pkg.project.name
      );
    }
    if (
      pkg.project.json.preconstruct.distFilenameStrategy ===
      "unscoped-package-name"
    ) {
      return getDistNameWithStrategy(
        pkg,
        entrypointName,
        "unscoped-package-name"
      );
    }
  }
  return getDistNameWithStrategy(pkg, entrypointName, "full");
}

export const validFieldsFromPkg = {
  main(pkg: Package, entrypointName: string) {
    let safeName = getDistName(pkg, entrypointName);
    return `dist/${safeName}.cjs.js`;
  },
  module(pkg: Package, entrypointName: string) {
    let safeName = getDistName(pkg, entrypointName);
    return `dist/${safeName}.esm.js`;
  },
  "umd:main"(pkg: Package, entrypointName: string) {
    let safeName = getDistName(pkg, entrypointName);
    return `dist/${safeName}.umd.min.js`;
  },
  browser(pkg: Package, hasModuleBuild: boolean, entrypointName: string) {
    let safeName = getDistName(pkg, entrypointName);

    let obj = {
      [`./dist/${safeName}.cjs.js`]: `./dist/${safeName}.browser.cjs.js`,
    };
    if (hasModuleBuild) {
      obj[`./dist/${safeName}.esm.js`] = `./dist/${safeName}.browser.esm.js`;
    }
    return obj;
  },
};

export function exportsField(
  pkg: Package
): Record<string, ExportsConditions | string> | undefined {
  if (
    !pkg.project.experimentalFlags.exports ||
    !pkg.json.preconstruct.exports
  ) {
    return;
  }
  const envConditions: ("worker" | "browser")[] =
    pkg.json.preconstruct.exports?.envConditions ?? [];

  let output: Record<string, ExportsConditions> = {};
  pkg.entrypoints.forEach((entrypoint) => {
    let exportConditions: ExportsConditions = getExportConditions(
      entrypoint,
      undefined
    );
    for (const env of envConditions) {
      exportConditions = {
        [env]: getExportConditions(entrypoint, env),
        ...exportConditions,
      };
    }

    output[
      "." + entrypoint.name.replace(entrypoint.package.name, "")
    ] = exportConditions;
  });
  return {
    "./package.json": "./package.json",
    ...output,
    ...pkg.json.preconstruct.exports?.extra,
  };
}

export function getExportConditions(
  entrypoint: Entrypoint,
  env: "worker" | "browser" | undefined
) {
  const safeName = getDistName(entrypoint.package, entrypoint.name);
  const prefix = entrypoint.name.replace(entrypoint.package.name, "");
  return {
    module: `.${prefix}/dist/${safeName}.${env ? `${env}.` : ""}esm.js`,
    default: `.${prefix}/dist/${safeName}.${env ? `${env}.` : ""}cjs.js`,
  };
}

export const validFieldsForEntrypoint = {
  main(entrypoint: Entrypoint) {
    return validFieldsFromPkg.main(entrypoint.package, entrypoint.name);
  },
  module(entrypoint: Entrypoint) {
    return validFieldsFromPkg.module(entrypoint.package, entrypoint.name);
  },
  "umd:main"(entrypoint: Entrypoint) {
    return validFieldsFromPkg["umd:main"](entrypoint.package, entrypoint.name);
  },
  browser(entrypoint: Entrypoint) {
    return validFieldsFromPkg.browser(
      entrypoint.package,
      entrypoint.json.module !== undefined,
      entrypoint.name
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
