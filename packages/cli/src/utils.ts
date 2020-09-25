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
      const urlRelativeToEntrypoint = entrypoint.name.replace(pkg.name, ".");
      exportsField[urlRelativeToEntrypoint] = {
        module: entrypoint.json.module
          ? `${urlRelativeToEntrypoint}/${validFields.module(entrypoint)}`
          : undefined,
        import: `${urlRelativeToEntrypoint}/dist/${getNameForDist(
          pkg.name
        )}.mjs`,
        require: `${urlRelativeToEntrypoint}/${validFields.main(entrypoint)}`,
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

export function mjsWrapperTemplate(
  exportNames: Iterable<string>,
  relativePath: string
) {
  const escapedPath = JSON.stringify(relativePath);
  let moduleStr = `import ___preconstruct_module_namespace from ${escapedPath};\n`;
  for (const exportName of exportNames) {
    moduleStr +=
      exportName === "default"
        ? "export default ___preconstruct_module_namespace;\n"
        : `export var ${exportName} = ___preconstruct_module_namespace.${exportName};\n`;
  }
  return moduleStr;
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | Array<JSONValue>
  | { [key: string]: JSONValue | undefined };
