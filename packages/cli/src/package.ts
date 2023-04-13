// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import fastGlob from "fast-glob";
import * as fs from "fs-extra";
import nodePath from "path";
import { Item } from "./item";
import { BatchError, FatalError } from "./errors";
import { Entrypoint } from "./entrypoint";
import jsonParse from "parse-json";

import { errors, confirms } from "./messages";
import { Project } from "./project";
import { getUselessGlobsThatArentReallyGlobsForNewEntrypoints } from "./glob-thing";
import {
  validFieldsForEntrypoint,
  JSONValue,
  getEntrypointName,
  setFieldInOrder,
  DistFilenameStrategy,
  MinimalEntrypoint,
} from "./utils";
import normalizePath from "normalize-path";

function getFieldsUsedInEntrypoints(
  descriptors: { contents: string | undefined; filename: string }[]
): Set<keyof typeof validFieldsForEntrypoint> {
  const fields = new Set<keyof typeof validFieldsForEntrypoint>(["main"]);
  for (let descriptor of descriptors) {
    if (descriptor.contents !== undefined) {
      let parsed = jsonParse(descriptor.contents, descriptor.filename);
      for (let field of ["module", "umd:main", "browser"] as const) {
        const value = parsed[field];
        if (value !== undefined) {
          fields.add(field);
        }
      }
    }
  }
  return fields;
}

function getPlainEntrypointContent(
  pkg: Package,
  fields: Set<keyof typeof validFieldsForEntrypoint>,
  entrypointDir: string,
  indent: string
) {
  const obj: Partial<Record<
    keyof typeof validFieldsForEntrypoint,
    string | Record<string, string | ExportsConditions>
  >> = {};
  const minimalEntrypoint: MinimalEntrypoint = {
    hasModuleField: fields.has("module"),
    name: getEntrypointName(pkg, entrypointDir),
    package: pkg,
  };
  for (const field of fields) {
    obj[field] = validFieldsForEntrypoint[field](minimalEntrypoint);
  }
  return JSON.stringify(obj, null, indent) + "\n";
}

function createEntrypoints(
  pkg: Package,
  descriptors: {
    filename: string;
    contents: string | undefined;
    hasAccepted: boolean;
    sourceFile: string;
  }[]
) {
  let fields = getFieldsUsedInEntrypoints(descriptors);

  return Promise.all(
    descriptors.map(async ({ filename, contents, hasAccepted, sourceFile }) => {
      if (contents === undefined) {
        if (!hasAccepted) {
          const entrypointName = getEntrypointName(
            pkg,
            nodePath.dirname(filename)
          );
          let shouldCreateEntrypointPkgJson = await confirms.createEntrypointPkgJson(
            { name: entrypointName }
          );
          if (!shouldCreateEntrypointPkgJson) {
            throw new FatalError(errors.noEntrypointPkgJson, entrypointName);
          }
        }
        contents = getPlainEntrypointContent(
          pkg,
          fields,
          nodePath.dirname(filename),
          pkg.indent
        );
        await fs.outputFile(filename, contents);
      }
      return new Entrypoint(filename, contents, pkg, sourceFile);
    })
  );
}

type BaseExportsConditions = {
  module: string | { worker?: string; browser?: string; default: string };
  default: string;
};

export type ExportsConditions = BaseExportsConditions & {
  development?: BaseExportsConditions;
};

export type EnvCondition = "browser" | "worker";

export class Package extends Item<{
  name?: JSONValue;
  preconstruct: {
    exports?: {
      extra?: Record<string, JSONValue>;
      envConditions?: EnvCondition[];
      useDevProdConditions?: boolean;
    };
    entrypoints?: JSONValue;
  };
  exports?: Record<string, ExportsConditions | string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}> {
  project!: Project;
  entrypoints!: Array<Entrypoint>;
  get configEntrypoints(): Array<string> {
    if (this.json.preconstruct.entrypoints === undefined) {
      return ["index.{js,jsx,ts,tsx}"];
    }
    if (
      Array.isArray(this.json.preconstruct.entrypoints) &&
      this.json.preconstruct.entrypoints.every((x) => typeof x === "string")
    ) {
      return this.json.preconstruct.entrypoints as string[];
    }

    throw new FatalError(
      "The entrypoints option for this packages is not an array of globs",
      this.name
    );
  }
  static async create(
    directory: string,
    project: Project,
    isFix: boolean
  ): Promise<Package> {
    let filePath = nodePath.join(directory, "package.json");

    let contents = await fs.readFile(filePath, "utf-8");
    let pkg = new Package(filePath, contents, project._jsonDataByPath);
    pkg.project = project;
    let entrypoints = await fastGlob(pkg.configEntrypoints, {
      cwd: nodePath.join(pkg.directory, "src"),
      onlyFiles: true,
      absolute: true,
    });
    // sorting the entrypoints is important since we want to have something consistent
    // to write into the `exports` field and file systems don't guarantee an order
    entrypoints = [
      ...entrypoints.sort((a, b) => {
        // shortest entrypoints first since shorter entrypoints
        // are generally more commonly used
        const comparison = a.length - b.length;
        if (comparison !== 0) return comparison;
        // then .sort's default behaviour because we just need something stable
        if (a < b) return -1;
        if (b > a) return 1;
        return 0;
      }),
    ];
    if (!entrypoints.length) {
      let oldEntrypoints = await fastGlob(pkg.configEntrypoints, {
        cwd: pkg.directory,
        onlyDirectories: true,
        absolute: true,
      });
      if (oldEntrypoints.length) {
        throw new FatalError(
          "this package has no entrypoints but it does have some using v1's entrypoints config, please see the the changelog for how to upgrade",
          pkg.name
        );
      }
    }
    pkg.entrypoints = await Promise.all(
      entrypoints.map(async (sourceFile) => {
        if (!/\.[tj]sx?$/.test(sourceFile)) {
          throw new FatalError(
            `entrypoint source files must end in .js, .jsx, .ts or .tsx but ${nodePath.relative(
              pkg.directory,
              sourceFile
            )} does not`,
            pkg.name
          );
        }
        if (
          !normalizePath(sourceFile).includes(
            normalizePath(nodePath.join(pkg.directory, "src"))
          )
        ) {
          throw new FatalError(
            `entrypoint source files must be inside of the src directory of a package but ${normalizePath(
              nodePath.relative(pkg.directory, sourceFile)
            )} is not`,
            pkg.name
          );
        }
        let directory = nodePath.join(
          pkg.directory,
          nodePath
            .resolve(sourceFile)
            .replace(nodePath.join(pkg.directory, "src"), "")
            .replace(/\.[tj]sx?$/, "")
        );
        if (nodePath.basename(directory) === "index") {
          directory = nodePath.dirname(directory);
        }
        let filename = nodePath.join(directory, "package.json");

        let contents: string | undefined = undefined;

        try {
          contents = await fs.readFile(filename, "utf-8");
        } catch (e) {
          if (e.code !== "ENOENT") {
            throw e;
          }
        }

        return { filename, contents, sourceFile, hasAccepted: isFix };
      })
    ).then(async (descriptors) => {
      const globErrors = await getUselessGlobsThatArentReallyGlobsForNewEntrypoints(
        pkg.configEntrypoints,
        entrypoints,
        pkg.directory
      );

      if (globErrors.length) {
        let errors = globErrors.map((globError) => {
          if (globError.exists) {
            return new FatalError(
              `specifies a entrypoint ${JSON.stringify(
                globError.glob
              )} but it is negated in the same config so it should be removed or the config should be fixed`,
              pkg.name
            );
          } else {
            return new FatalError(
              `specifies a entrypoint ${JSON.stringify(
                globError.glob
              )} but the file does not exist, please create it or fix the config`,
              pkg.name
            );
          }
        });
        if (errors.length) {
          throw new BatchError(errors);
        }
      }

      return createEntrypoints(pkg, descriptors);
    });
    const entrypointsWithSourcePath = new Map<string, string>();
    for (const entrypoint of pkg.entrypoints) {
      if (entrypoint.json.preconstruct.source !== undefined) {
        throw new FatalError(
          "The source option on entrypoints no longer exists, see the changelog for how to upgrade to the new entrypoints config",
          this.name
        );
      }
      if (entrypointsWithSourcePath.has(entrypoint.name)) {
        throw new FatalError(
          `this package has multiple source files for the same entrypoint of ${
            entrypoint.name
          } at ${normalizePath(
            nodePath.relative(
              pkg.directory,
              entrypointsWithSourcePath.get(entrypoint.name)!
            )
          )} and ${normalizePath(
            nodePath.relative(pkg.directory, entrypoint.source)
          )}`,
          pkg.name
        );
      }
      entrypointsWithSourcePath.set(entrypoint.name, entrypoint.source);
    }

    return pkg;
  }

  setFieldOnEntrypoints(field: "main" | "browser" | "module" | "umd:main") {
    this.entrypoints.forEach((entrypoint) => {
      entrypoint.json = setFieldInOrder(
        entrypoint.json,
        field,
        validFieldsForEntrypoint[field](entrypoint)
      );
    });
  }

  get name(): string {
    if (typeof this.json.name !== "string") {
      throw new FatalError(
        "The name field on this package is not a string",
        this.directory
      );
    }
    return this.json.name;
  }

  get distFilenameStrategy(): DistFilenameStrategy {
    if ("distFilenameStrategy" in this.project.json.preconstruct) {
      const written = this.project.json.preconstruct.distFilenameStrategy;
      if (written !== "full" && written !== "unscoped-package-name") {
        throw new FatalError(
          `distFilenameStrategy is defined in your Preconstruct config as ${JSON.stringify(
            written
          )} but the only accepted values are "full" and "unscoped-package-name"`,
          this.project.name
        );
      }
      return written;
    }
    return "full";
  }

  exportsFieldConfig(): CanonicalExportsFieldConfig {
    let defaultExportsFieldEnabled = false;
    if (this.project.directory !== this.directory) {
      const exportsFieldConfig = this.project.json.preconstruct.exports;
      if (exportsFieldConfig !== undefined) {
        if (typeof exportsFieldConfig === "boolean") {
          defaultExportsFieldEnabled = exportsFieldConfig;
        } else {
          throw new FatalError(
            'the "preconstruct.exports" field must be a boolean at the project level',
            this.project.name
          );
        }
      }
    }
    return parseExportsFieldConfig(
      this.json.preconstruct.exports,
      defaultExportsFieldEnabled,
      this.name
    );
  }
}

export type CanonicalExportsFieldConfig =
  | undefined
  | {
      envConditions: Set<"worker" | "browser">;
      useDevProdConditions: boolean;
      extra: Record<string, JSONValue>;
    };

function parseExportsFieldConfig(
  _config: unknown,
  defaultExportsFieldEnabled: boolean,
  name: string
): CanonicalExportsFieldConfig {
  // the seperate assignment vs declaration is so that TypeScript's
  // control flow analysis does what we want
  let config;
  config = _config;
  if (
    (typeof config !== "boolean" &&
      typeof config !== "object" &&
      config !== undefined) ||
    config === null ||
    Array.isArray(config)
  ) {
    throw new FatalError(
      'the "preconstruct.exports" field must be a boolean or an object at the package level',
      name
    );
  }
  if (config === undefined) {
    config = defaultExportsFieldEnabled;
  }
  if (config === false) {
    return undefined;
  }
  const parsedConfig: CanonicalExportsFieldConfig = {
    envConditions: new Set(),
    extra: {},
    useDevProdConditions: false,
  };
  if (config === true) {
    return parsedConfig;
  }
  for (const [key, value] of Object.entries(config) as [string, unknown][]) {
    if (key === "extra") {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        parsedConfig.extra = value as Record<string, JSONValue>;
      } else {
        throw new FatalError(
          'the "preconstruct.exports.extra" field must be an object if it is present',
          name
        );
      }
    } else if (key === "envConditions") {
      if (
        Array.isArray(value) &&
        value.every(
          (v): v is "worker" | "browser" => v === "worker" || v === "browser"
        )
      ) {
        parsedConfig.envConditions = new Set(value);
        if (parsedConfig.envConditions.size !== value.length) {
          throw new FatalError(
            'the "preconstruct.exports.envConditions" field must not have duplicates',
            name
          );
        }
      } else {
        throw new FatalError(
          'the "preconstruct.exports.envConditions" field must be an array containing zero or more of "worker" and "browser" if it is present',
          name
        );
      }
    } else if (key === "useDevProdConditions") {
      if (typeof value === "boolean") {
        parsedConfig.useDevProdConditions = value;
      } else {
        throw new FatalError(
          'the "preconstruct.exports.useDevProdConditions" field must be a boolean if it is present',
          name
        );
      }
    } else {
      throw new FatalError(
        `the "preconstruct.exports" field contains an unknown key "${key}"`,
        name
      );
    }
  }
  return parsedConfig;
}
