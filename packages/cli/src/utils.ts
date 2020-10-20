import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import { Package } from "./package";
import * as nodePath from "path";

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

function getDistName(pkg: Package, entrypointName: string): string {
  if (pkg.project.experimentalFlags.newDistFilenames) {
    if ("useOldDistFilenames" in pkg.project.json.preconstruct) {
      if (
        typeof pkg.project.json.preconstruct.useOldDistFilenames !== "boolean"
      ) {
        throw new Error(
          `If useOldDistFilenames is defined in your Preconstruct config, it must be a boolean`
        );
      }
      if (pkg.project.json.preconstruct.useOldDistFilenames) {
        return pkg.name.replace(/.*\//, "");
      }
    }
    return entrypointName.replace("@", "").replace(/\//g, "");
  }
  return pkg.name.replace(/.*\//, "");
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

export const validFields = {
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
