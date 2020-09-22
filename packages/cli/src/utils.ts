import { Entrypoint } from "./entrypoint";
import { Package } from "./package";

export function getNameForDist(name: string): string {
  return name.replace(/.*\//, "");
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

export const validFieldsFromPkgName = {
  main(pkgName: string) {
    let safeName = getNameForDist(pkgName);
    return `dist/${safeName}.cjs.js`;
  },
  module(pkgName: string) {
    let safeName = getNameForDist(pkgName);
    return `dist/${safeName}.esm.js`;
  },
  "umd:main"(pkgName: string) {
    let safeName = getNameForDist(pkgName);
    return `dist/${safeName}.umd.min.js`;
  },
  browser(pkgName: string, hasModuleBuild: boolean) {
    let safeName = getNameForDist(pkgName);

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
  exports(pkg: Package) {
    let exportsField: Record<
      string,
      { module?: string; import: string; require: string }
    > = {};
    pkg.entrypoints.forEach((entrypoint) => {
      exportsField[entrypoint.name.replace(pkg.name, ".")] = {
        import: "",
      };
    });
    return exportsField;
  },
  main(entrypoint: Entrypoint) {
    return validFieldsFromPkgName.main(entrypoint.package.name);
  },
  module(entrypoint: Entrypoint) {
    return validFieldsFromPkgName.module(entrypoint.package.name);
  },
  "umd:main"(entrypoint: Entrypoint) {
    return validFieldsFromPkgName["umd:main"](entrypoint.package.name);
  },
  browser(entrypoint: Entrypoint) {
    return validFieldsFromPkgName.browser(
      entrypoint.package.name,
      entrypoint.json.module !== undefined
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
