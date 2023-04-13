import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import {
  Package,
  ExportsConditions,
  CanonicalExportsFieldConfig,
} from "./package";
import * as nodePath from "path";

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

interface DeepStringValues {
  [key: string]: string | DeepStringValues;
}

function forkExtensionsRecursively<T extends DeepStringValues>(
  obj: T,
  extensionFork: "dev" | "prod"
): T {
  const result: DeepStringValues = {};
  for (let key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }
    const value = obj[key];
    if (typeof value === "string") {
      result[key] = forkExtension(value, extensionFork);
    } else if (value) {
      result[key] = forkExtensionsRecursively(value, extensionFork);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function entryPointExports(
  entrypoint: Entrypoint,
  exportsFieldConfig: NonNullable<CanonicalExportsFieldConfig>,
  extensionFork?: "dev" | "prod"
) {
  const esmBuild = getExportsFieldOutputPath(entrypoint, "esm");

  const exports = {
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
    default: getExportsFieldOutputPath(entrypoint, "cjs"),
  };

  if (extensionFork) {
    return forkExtensionsRecursively(exports, extensionFork);
  }

  return exports;
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
    output[
      "." + entrypoint.name.replace(entrypoint.package.name, "")
    ] = exportsFieldConfig.useDevProdConditions
      ? {
          development: entryPointExports(entrypoint, exportsFieldConfig, "dev"),
          ...entryPointExports(entrypoint, exportsFieldConfig, "prod"),
        }
      : entryPointExports(entrypoint, exportsFieldConfig);
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

export function forkExtension(pathLike: string, fork: string): string {
  return pathLike.replace(/(\.[^\.]+$)/, `.${fork}$1`);
}

function getDistFilename(entrypoint: MinimalEntrypoint, target: BuildTarget) {
  return `dist/${getBaseDistName(entrypoint)}.${getDistExtension(target)}`;
}

export function getExportsFieldOutputPath(
  entrypoint: Entrypoint,
  target: BuildTarget
) {
  const prefix = entrypoint.name.replace(entrypoint.package.name, "");
  return `.${prefix}/${getDistFilename(entrypoint, target)}`;
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

export function tsTemplate(
  filename: string,
  hasDefaultExport: boolean,
  relativePath: string
) {
  const escapedPath = JSON.stringify(relativePath);
  return `export * from ${escapedPath};${
    hasDefaultExport ? `\nexport { default } from ${escapedPath};` : ""
  }\n//# sourceMappingURL=${filename}.map\n`;
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
