// @flow

export function getNameForDist(name: string): string {
  return name.replace(/.*\//, "");
}

export function getValidStringFieldContentForBuildType(
  type: "main" | "module" | "umd:main" | "types",
  pkgName: string
) {
  let safeName = getNameForDist(pkgName);
  switch (type) {
    case "main": {
      return `dist/${safeName}.cjs.js`;
    }
    case "module": {
      return `dist/${safeName}.esm.js`;
    }
    case "umd:main": {
      return `dist/${safeName}.umd.min.js`;
    }
    case "types": {
      return `dist/${safeName}.cjs.js.ts`;
    }
  }
  throw new Error(
    `unknown string build type: ${type}. this is likely a bug in preconstruct.`
  );
}

export function getValidObjectFieldContentForBuildType(
  type: "browser",
  pkgName: string,
  hasModuleBuild: boolean
) {
  let safeName = getNameForDist(pkgName);
  switch (type) {
    case "browser": {
      let obj = {
        [`./dist/${safeName}.cjs.js`]: `./dist/${safeName}.browser.cjs.js`
      };
      if (hasModuleBuild) {
        obj[`./dist/${safeName}.esm.js`] = `./dist/${safeName}.browser.esm.js`;
      }
      return obj;
    }
  }
  throw new Error(
    `unknown object build type: ${type}. this is likely a bug in preconstruct.`
  );
}

export function flowTemplate(hasDefaultExport: boolean, relativePath: string) {
  return `// @flow
export * from "${relativePath}";${
    hasDefaultExport ? `\nexport { default } from "${relativePath}";` : ""
  }\n`;
}

export function tsTemplate(hasDefaultExport: boolean, relativePath: string) {
  return `export * from "${relativePath}";${
    hasDefaultExport ? `\nexport { default } from "${relativePath}";` : ""
  }\n`;
}
