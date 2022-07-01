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
  validFieldsFromPkg,
  JSONValue,
  getEntrypointName,
  setFieldInOrder,
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
  for (const field of fields) {
    if (field === "browser") {
      obj[field] = validFieldsFromPkg[field](
        pkg,
        fields.has("module"),
        getEntrypointName(pkg, entrypointDir)
      );
    } else {
      obj[field] = validFieldsFromPkg[field](
        pkg,
        getEntrypointName(pkg, entrypointDir)
      );
    }
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

export type ExportsConditions =
  | {
      worker?: { module: string; default: string } | string;
      browser?: { module: string; default: string } | string;
      module?: string;
      default: string;
    }
  | string;

export type ExportsCondition = "browser" | "worker" | "module" | "default";

export class Package extends Item<{
  name?: JSONValue;
  preconstruct: {
    exports?: {
      extra?: Record<string, JSONValue>;
      conditions?: ExportsCondition[];
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
}
