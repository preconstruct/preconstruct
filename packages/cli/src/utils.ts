import normalizePath from "normalize-path";
import { Entrypoint } from "./entrypoint";
import {
  Package,
  ExportsConditions,
  CanonicalExportsFieldConfig,
} from "./package";
import * as nodePath from "path";
import { FatalError } from "./errors";
import { createExportsField } from "./imports";
import fs from "node:fs/promises";

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
  let output: Record<string, unknown> = {};

  if (exportsFieldConfig.conditions.kind === "legacy") {
    output = exportsFieldForLegacyConditions(
      pkg,
      exportsFieldConfig.conditions.envs,
      exportsFieldConfig.importConditionDefaultExport
    );
  } else {
    const isTypeModule = pkg.isTypeModule();
    for (const entrypoint of pkg.entrypoints) {
      if (isTypeModule) {
        const groups = [...exportsFieldConfig.conditions.groups];
        const hasNoConditions =
          groups.length === 1 &&
          groups[0][0].length === 0 &&
          groups[0][1].length === 1 &&
          groups[0][1][0].length === 0;
        const exportsField = createExportsField(
          exportsFieldConfig.conditions.groups,
          (conditions) => ({
            default: getExportsFieldOutputPathForConditionsWithTypeModule(
              entrypoint,
              conditions
            ),
          })
        );
        const key = "." + entrypoint.afterPackageName;
        if (
          hasNoConditions &&
          Object.keys(exportsField).length === 1 &&
          exportsField.default
        ) {
          output[key] = exportsField.default;
          continue;
        }
        const exports = createExportsField(
          exportsFieldConfig.conditions.groups,
          (conditions) =>
            getExportsFieldOutputPathForConditionsWithTypeModule(
              entrypoint,
              conditions
            )
        );
        output[key] = {
          // yes, i'm very intentionally pointing at the .js/.mjs rather than the .d.ts/.d.mts
          // TODO: this should probably only be here if you're using ts
          // or maybe we just generate more .d.ts files in the dist rather than having a types condition
          types: getExportsFieldOutputPathForConditionsWithTypeModule(
            entrypoint,
            []
          ),
          ...(typeof exports === "string" ? { default: exports } : exports),
        };
        continue;
      }
      output["." + entrypoint.afterPackageName] = {
        // yes, i'm very intentionally pointing at the .js/.mjs rather than the .d.ts/.d.mts
        // TODO: this should probably only be here if you're using ts
        // or maybe we just generate more .d.ts files in the dist rather than having a types condition
        types:
          exportsFieldConfig.importConditionDefaultExport === "default"
            ? {
                import: getExportsFieldOutputPathForConditions(entrypoint, [
                  "import",
                ]),
                default: getExportsFieldOutputPathForConditions(entrypoint, []),
              }
            : getExportsFieldOutputPathForConditions(entrypoint, []),
        ...createExportsField(
          exportsFieldConfig.conditions.groups,
          (conditions) => ({
            module: getExportsFieldOutputPathForConditions(
              entrypoint,
              conditions.concat("module")
            ),
            ...(exportsFieldConfig.importConditionDefaultExport ===
              "default" && {
              import: getExportsFieldOutputPathForConditions(
                entrypoint,
                conditions.concat("import")
              ),
            }),
            default: getExportsFieldOutputPathForConditions(
              entrypoint,
              conditions
            ),
          })
        ),
      };
    }
  }

  return {
    ...output,
    "./package.json": "./package.json",
    ...exportsFieldConfig.extra,
  };
}

function exportsFieldForLegacyConditions(
  pkg: Package,
  envs: ({
    kind: "legacy";
  } & CanonicalExportsFieldConfig["conditions"])["envs"],
  importConditionDefaultExport: CanonicalExportsFieldConfig["importConditionDefaultExport"]
) {
  let output: Record<string, ExportsConditions> = {};
  for (const entrypoint of pkg.entrypoints) {
    const esmBuild = getExportsFieldOutputPath(entrypoint, "esm");
    const exportConditions = {
      module: envs.size
        ? {
            ...(envs.has("worker") && {
              worker: getExportsFieldOutputPath(entrypoint, "worker"),
            }),
            ...(envs.has("browser") && {
              browser: getExportsFieldOutputPath(entrypoint, "browser-esm"),
            }),
            default: esmBuild,
          }
        : esmBuild,
      ...(importConditionDefaultExport === "default" && {
        import: getExportsImportUnwrappingDefaultOutputPath(entrypoint),
      }),
      default: getExportsFieldOutputPath(entrypoint, "cjs"),
    };

    output["." + entrypoint.afterPackageName] = exportConditions;
  }
  return output;
}

type BuildTarget =
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

export function getDistExtensionForConditions(conditions: string[]) {
  const forJoining: string[] = [];
  let ext: "esm.js" | "cjs.js" | "cjs.mjs" = "cjs.js";
  for (const condition of conditions) {
    if (condition === "module") {
      if (ext !== "cjs.js") {
        throw new Error(`unexpected module and import conditions together`);
      }
      ext = "esm.js";
      continue;
    }
    if (condition === "import") {
      if (ext !== "cjs.js") {
        throw new Error(`unexpected module and import conditions together`);
      }
      ext = "cjs.mjs";
      continue;
    }
    forJoining.push(condition);
  }
  forJoining.push(ext);
  return forJoining.join(".");
}

export function getDistFilenameForConditions(
  entrypoint: MinimalEntrypoint,
  conditions: string[]
) {
  return `dist/${getBaseDistName(entrypoint)}.${getDistExtensionForConditions(
    conditions
  )}`;
}

export function getBaseDistFilename(
  entrypoint: MinimalEntrypoint,
  target: BuildTarget
) {
  return `${getBaseDistName(entrypoint)}.${getDistExtension(target)}`;
}

function getDistFilename(entrypoint: MinimalEntrypoint, target: BuildTarget) {
  if (entrypoint.package.project.experimentalFlags.distInRoot) {
    if (entrypoint.package.name === entrypoint.name) {
      return `dist/${getBaseDistFilename(entrypoint, target)}`;
    }
    return (
      "../".repeat(
        entrypoint.name.slice(entrypoint.package.name.length + 1).split("/")
          .length
      ) + `dist/${getBaseDistFilename(entrypoint, target)}`
    );
  }
  return `dist/${getBaseDistFilename(entrypoint, target)}`;
}

function getExportsFieldEntrypointOutputPrefix(entrypoint: Entrypoint) {
  if (entrypoint.package.project.experimentalFlags.distInRoot) return "./";
  return `.${entrypoint.afterPackageName}/`;
}

export function getExportsFieldOutputPath(
  entrypoint: Entrypoint,
  target: BuildTarget
) {
  return (
    getExportsFieldEntrypointOutputPrefix(entrypoint) +
    getDistFilename(entrypoint, target)
  );
}

function getExportsFieldOutputPathForConditions(
  entrypoint: Entrypoint,
  conditions: string[]
) {
  return (
    getExportsFieldEntrypointOutputPrefix(entrypoint) +
    getDistFilenameForConditions(entrypoint, conditions)
  );
}

function getExportsFieldOutputPathForConditionsWithTypeModule(
  entrypoint: Entrypoint,
  conditions: string[]
) {
  return (
    getExportsFieldEntrypointOutputPrefix(entrypoint) +
    getDistFilenameForConditionsWithTypeModule(entrypoint, conditions)
  );
}

export function getDistFilenameForConditionsWithTypeModule(
  entrypoint: MinimalEntrypoint,
  conditions: string[]
) {
  return `dist/${getBaseDistName(
    entrypoint
  )}.${getDistExtensionForConditionsWithTypeModule(conditions)}`;
}

export function getDistExtensionForConditionsWithTypeModule(
  conditions: string[]
) {
  if (conditions.length === 0) return "js";
  return `${conditions.join(".")}.js`;
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
  relativePath: string,
  relativePathWithExtension: string
) {
  return `${esmReexportTemplate(
    hasDefaultExport,
    relativePath
  )}${getDeclSourceMapComment(filename, relativePathWithExtension)}`;
}

function getReexportStatement(namedExports: string[], source: string): string {
  if (!namedExports.length) {
    // side-effects are important
    return `import ${source};`;
  }
  // rollup will say a chunk has a "*external-pkg" export when it has an export * from 'external-pkg'
  if (namedExports.some((exported) => exported[0] === "*")) {
    return `export * from ${source};`;
  }
  return `export {\n  ${namedExports.join(",\n  ")}\n} from ${source};`;
}

export function getJsDefaultForMjsFilepath(mjsPath: string) {
  return mjsPath.replace(/\.mjs$/, ".default.js");
}

export function getDtsDefaultForMtsFilepath(mjsPath: string) {
  return mjsPath.replace(/\.d\.mts$/, ".default.d.ts");
}

export function jsDefaultForMjsTemplate(relativePath: string) {
  return `exports._default = require(${JSON.stringify(
    relativePath
  )}).default;\n`;
}

export function dtsDefaultForDmtsTemplate(relativePath: string) {
  return `export { default as _default } from ${JSON.stringify(
    relativePath
  )}\n`;
}

export function mjsTemplate(
  exports: string[],
  relativePath: string,
  mjsPath: string
) {
  const escapedPath = JSON.stringify(relativePath);
  const nonDefaultExports = exports.filter((name) => name !== "default");
  const hasDefaultExport = exports.length !== nonDefaultExports.length;
  return `${getReexportStatement(nonDefaultExports, escapedPath)}\n${
    hasDefaultExport
      ? `export { _default as default } from ${JSON.stringify(
          "./" + getJsDefaultForMjsFilepath(nodePath.basename(mjsPath))
        )};\n`
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
  relativePath: string,
  relativePathWithExtension: string
) {
  return `export * from ${JSON.stringify(relativePath)};\n${
    hasDefaultExport
      ? `export { _default as default } from ${JSON.stringify(
          "./" + nodePath.basename(filename).replace(/\.d\.mts$/, ".default.js")
        )};\n`
      : ""
  }${getDeclSourceMapComment(filename, relativePathWithExtension)}`;
}

function getDeclSourceMapComment(
  dtsFilename: string,
  relativePathWithExtension: string
) {
  return `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(
    JSON.stringify({
      version: 3,
      file: dtsFilename,
      sourceRoot: "",
      sources: [relativePathWithExtension],
      names: [],
      mappings: "AAAA",
    })
  ).toString("base64")}\n`;
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | Array<JSONValue>
  | { [key: string]: JSONValue | undefined };

export function parseImportConditionDefaultExportOption(
  value: unknown,
  name: string
): "default" | "namespace" {
  if (value === "default" || value === "namespace") {
    return value;
  }
  throw new FatalError(
    'the "preconstruct.exports.importConditionDefaultExport" field must be set to "default" or "namespace" if it is present',
    name
  );
}

export async function fsOutputFile(
  file: string,
  data:
    | string
    | NodeJS.ArrayBufferView
    | Iterable<string | NodeJS.ArrayBufferView>
    | AsyncIterable<string | NodeJS.ArrayBufferView>
): Promise<void> {
  await fs.mkdir(nodePath.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}
