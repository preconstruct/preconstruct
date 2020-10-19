import { Entrypoint } from "./entrypoint";
import { Package } from "./package";

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

function getDistName(pkg: Package, entrypointName: string): string {
  if (pkg.project.experimentalFlags.newDistFilenames) {
    return entrypointName.replace("@", "").replace(/\//g, "");
  }
  return pkg.name.replace(/.*\//, "");
}

export const validFieldsFromPkgName = {
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
    return validFieldsFromPkgName.main(entrypoint.package, entrypoint.name);
  },
  module(entrypoint: Entrypoint) {
    return validFieldsFromPkgName.module(entrypoint.package, entrypoint.name);
  },
  "umd:main"(entrypoint: Entrypoint) {
    return validFieldsFromPkgName["umd:main"](
      entrypoint.package,
      entrypoint.name
    );
  },
  browser(entrypoint: Entrypoint) {
    return validFieldsFromPkgName.browser(
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
