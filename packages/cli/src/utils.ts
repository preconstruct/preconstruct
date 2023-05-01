import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import { Package, ExportsConditions } from "./package";
import * as nodePath from "path";
import { FatalError } from "./errors";

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

export type DistFilenameStrategy = "full" | "unscoped-package-name";

export type MinimalEntrypoint = {
  package: Package;
  name: string;
  hasModuleField: boolean;
};

export function getBaseDistName(entrypoint: MinimalEntrypoint) {
  const strategy = entrypoint.package.distFilenameStrategy;
  if (strategy === "full") {
    return entrypoint.name.replace("@", "").replace(/\//g, "-");
  }
  return entrypoint.package.name.replace(/.*\//, "");
}

export function exportsField(
  pkg: Package
): Record<string, ExportsConditions | string> | undefined {
  const exportsFieldConfig = pkg.exportsFieldConfig();
  if (!exportsFieldConfig) {
    return;
  }

  let output: Record<string, ExportsConditions> = {};
  pkg.entrypoints.forEach((entrypoint) => {
    const esmBuild = getExportsFieldOutputPath(entrypoint, "esm");
    const exportConditions = {
      module: exportsFieldConfig.envConditions.size
        ? {
            ...(exportsFieldConfig.envConditions.has("worker") && {
              worker: getExportsFieldOutputPath(entrypoint, "worker"),
            }),
            ...(exportsFieldConfig.envConditions.has("browser") && {
              browser: getExportsFieldOutputPath(entrypoint, "browser-esm"),
            }),
            default: esmBuild,
          }
        : esmBuild,
      ...(exportsFieldConfig.importConditionDefaultExport === "default" && {
        import: getExportsImportUnwrappingDefaultOutputPath(entrypoint),
      }),
      default: getExportsFieldOutputPath(entrypoint, "cjs"),
    };

    output[
      "." + entrypoint.name.replace(entrypoint.package.name, "")
    ] = exportConditions;
  });
  return {
    ...output,
    "./package.json": "./package.json",
    ...exportsFieldConfig.extra,
  };
}

export type BuildTarget =
  | "cjs"
  | "esm"
  | "umd"
  | "worker"
  | "browser-cjs"
  | "browser-esm";

const buildTargetToExtensionPrefix: Record<BuildTarget, string> = {
  cjs: "cjs",
  esm: "esm",
  "browser-cjs": "browser.cjs",
  "browser-esm": "browser.esm",
  worker: "worker.esm",
  umd: "umd.min",
};

export function getDistExtension(target: BuildTarget) {
  return `${buildTargetToExtensionPrefix[target]}.js`;
}

export function getBaseDistFilename(
  entrypoint: MinimalEntrypoint,
  target: BuildTarget
) {
  return `${getBaseDistName(entrypoint)}.${getDistExtension(target)}`;
}

function getDistFilename(entrypoint: MinimalEntrypoint, target: BuildTarget) {
  return `dist/${getBaseDistFilename(entrypoint, target)}`;
}

export function getExportsFieldOutputPath(
  entrypoint: Entrypoint,
  target: BuildTarget
) {
  const prefix = entrypoint.name.replace(entrypoint.package.name, "");
  return `.${prefix}/${getDistFilename(entrypoint, target)}`;
}

export function getExportsImportUnwrappingDefaultOutputPath(
  entrypoint: Entrypoint
) {
  return getExportsFieldOutputPath(entrypoint, "cjs").replace(/\.js$/, ".mjs");
}

export const validFieldsForEntrypoint = {
  main(entrypoint: MinimalEntrypoint) {
    return getDistFilename(entrypoint, "cjs");
  },
  module(entrypoint: MinimalEntrypoint) {
    return getDistFilename(entrypoint, "esm");
  },
  "umd:main"(entrypoint: MinimalEntrypoint) {
    return getDistFilename(entrypoint, "umd");
  },
  browser(entrypoint: MinimalEntrypoint) {
    const moduleBuild = {
      [`./${getDistFilename(entrypoint, "esm")}`]: `./${getDistFilename(
        entrypoint,
        "browser-esm"
      )}`,
    };

    if (entrypoint.package.exportsFieldConfig()) {
      return moduleBuild;
    }

    return {
      [`./${getDistFilename(entrypoint, "cjs")}`]: `./${getDistFilename(
        entrypoint,
        "browser-cjs"
      )}`,
      ...(entrypoint.hasModuleField && moduleBuild),
    };
  },
};

export function flowTemplate(hasDefaultExport: boolean, relativePath: string) {
  const escapedPath = JSON.stringify(relativePath);
  return `// @flow
export * from ${escapedPath};${
    hasDefaultExport ? `\nexport { default } from ${escapedPath};` : ""
  }\n`;
}

function esmReexportTemplate(hasDefaultExport: boolean, relativePath: string) {
  const escapedPath = JSON.stringify(relativePath);
  return `export * from ${escapedPath};${
    hasDefaultExport ? `\nexport { default } from ${escapedPath};` : ""
  }\n`;
}

export function dtsTemplate(
  filename: string,
  hasDefaultExport: boolean,
  relativePath: string
) {
  return `${esmReexportTemplate(
    hasDefaultExport,
    relativePath
  )}//# sourceMappingURL=${filename}.map\n`;
}

function getReexportStatement(namedExports: string[], source: string): string {
  // rollup will say a chunk has a "*external-pkg" export when it has an export * from 'external-pkg'
  if (namedExports.some((exported) => exported[0] === "*")) {
    return `export * from ${source};`;
  }
  return `export {\n  ${namedExports.join(",\n  ")}\n} from ${source};`;
}

export function mjsTemplate(exports: string[], relativePath: string) {
  const escapedPath = JSON.stringify(relativePath);
  const nonDefaultExports = exports.filter((name) => name !== "default");
  const hasDefaultExport = exports.length !== nonDefaultExports.length;
  return `${getReexportStatement(nonDefaultExports, escapedPath)}\n${
    hasDefaultExport
      ? `import ns from ${escapedPath};\nexport default ns.default;\n`
      : ""
  }`;
}

// the only reason we sometimes name exports explicitly in the mjs template is
// to avoid adding __esModule as an export, this doesn't apply to the .d.mts
// since __esModule doesn't exist in declaration files
// just doing export * is nice because it means we don't have to bother
// getting the type-only exports
export function dmtsTemplate(
  filename: string,
  hasDefaultExport: boolean,
  relativePath: string
) {
  return (
    mjsTemplate(hasDefaultExport ? ["default", "*"] : ["*"], relativePath) +
    `//# sourceMappingURL=${filename}.map\n`
  );
}

export function tsReexportDeclMap(
  dtsFilename: string,
  relativePathWithExtension: string
) {
  return (
    JSON.stringify({
      version: 3,
      file: dtsFilename,
      sourceRoot: "",
      sources: [relativePathWithExtension],
      names: [],
      mappings: "AAAA",
    }) + "\n"
  );
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | Array<JSONValue>
  | { [key: string]: JSONValue | undefined };

export function parseimportConditionDefaultExportOption(
  value: unknown,
  name: string
) {
  if (value === "default" || value === "namespace") {
    return value;
  }
  throw new FatalError(
    'the "preconstruct.exports.importConditionDefaultExport" field must be set to "default" or "namespace" if it is present',
    name
  );
}
