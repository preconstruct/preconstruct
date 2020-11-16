// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import globby from "globby";
import * as fs from "fs-extra";
import nodePath from "path";
import { Item } from "./item";
import { FatalError } from "./errors";
import { Entrypoint } from "./entrypoint";
import jsonParse from "parse-json";

import { errors, confirms } from "./messages";
import { Project } from "./project";
import { getUselessGlobsThatArentReallyGlobs } from "./glob-thing";
import detectIndent from "detect-indent";
import {
  validFields,
  validFieldsFromPkg,
  JSONValue,
  getEntrypointName,
  setFieldInOrder,
} from "./utils";

function getFieldsUsedInEntrypoints(
  descriptors: { contents: string | undefined; filename: string }[]
) {
  const fields = new Set<keyof typeof validFields>(["main"]);
  for (let descriptor of descriptors) {
    if (descriptor.contents !== undefined) {
      let parsed = jsonParse(descriptor.contents, descriptor.filename);
      for (let field of ["module", "umd:main", "browser"] as const) {
        if (parsed[field] !== undefined) {
          fields.add(field);
        }
      }
    }
  }
  return fields;
}

function getPlainEntrypointContent(
  pkg: Package,
  fields: Set<keyof typeof validFields>,
  entrypointDir: string,
  indent: string
) {
  const obj: Partial<Record<
    keyof typeof validFields,
    string | Record<string, string>
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
    sourceFile?: string;
  }[]
) {
  let fields = getFieldsUsedInEntrypoints(descriptors);
  let { indent } = detectIndent(pkg._contents);

  return Promise.all(
    descriptors.map(async ({ filename, contents, hasAccepted, sourceFile }) => {
      if (contents === undefined || hasAccepted) {
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
          indent
        );
        await fs.outputFile(filename, contents);
      }
      return new Entrypoint(filename, contents, pkg, sourceFile);
    })
  );
}

export class Package extends Item<{
  name?: JSONValue;
  preconstruct: {
    entrypoints?: JSONValue;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}> {
  project!: Project;
  entrypoints!: Array<Entrypoint>;
  get configEntrypoints(): Array<string> {
    if (this.json.preconstruct.entrypoints === undefined) {
      return this.project.experimentalFlags.newEntrypoints
        ? ["index.{js,jsx,ts,tsx}"]
        : ["."];
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
    let pkg = new Package(filePath, contents);
    pkg.project = project;
    if (project.experimentalFlags.newEntrypoints) {
      let entrypoints = await globby(pkg.configEntrypoints, {
        cwd: nodePath.join(pkg.directory, "src"),
        onlyFiles: true,
        absolute: true,
        expandDirectories: false,
      });
      if (!entrypoints.length) {
        let oldEntrypoints = await globby(pkg.configEntrypoints, {
          cwd: pkg.directory,
          onlyDirectories: true,
          absolute: true,
          expandDirectories: false,
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
            } at ${nodePath.relative(
              pkg.directory,
              entrypointsWithSourcePath.get(entrypoint.name)!
            )} and ${nodePath.relative(pkg.directory, entrypoint.source)}`,
            pkg.name
          );
        }
        entrypointsWithSourcePath.set(entrypoint.name, entrypoint.source);
      }
    } else {
      let entrypointDirectories = await globby(pkg.configEntrypoints, {
        cwd: pkg.directory,
        onlyDirectories: true,
        absolute: true,
        expandDirectories: false,
      });
      pkg.entrypoints = await Promise.all(
        entrypointDirectories.map(async (directory) => {
          let filename = nodePath.join(directory, "package.json");

          let contents: undefined | string;

          try {
            contents = await fs.readFile(filename, "utf-8");
          } catch (e) {
            if (e.code !== "ENOENT") {
              throw e;
            }
          }

          return { filename, contents, hasAccepted: false };
        })
      ).then(async (descriptors) => {
        let globErrors = await getUselessGlobsThatArentReallyGlobs(
          pkg.configEntrypoints,
          pkg.directory
        );

        if (globErrors.some((x) => x !== undefined)) {
          await Promise.all(
            globErrors.map(async (globError, index) => {
              if (globError !== undefined) {
                let shouldCreateEntrypoint = await confirms.createEntrypoint({
                  name: nodePath.join(
                    pkg.name,
                    nodePath.relative(pkg.directory, globError)
                  ),
                });
                if (shouldCreateEntrypoint) {
                  descriptors.push({
                    contents: undefined,
                    filename: nodePath.resolve(
                      pkg.directory,
                      globError,
                      "package.json"
                    ),
                    hasAccepted: true,
                  });
                  await fs.mkdirp(globError);
                } else {
                  (pkg.json.preconstruct.entrypoints as any[])[
                    index
                  ] = undefined;
                }
              }
            })
          );
          pkg.json.preconstruct.entrypoints = (pkg.json.preconstruct
            .entrypoints as string[]).filter((x: string | undefined) => x);
          await pkg.save();
        }

        return createEntrypoints(pkg, descriptors);
      });
    }

    return pkg;
  }

  setFieldOnEntrypoints(field: "main" | "browser" | "module" | "umd:main") {
    this.entrypoints.forEach((entrypoint) => {
      entrypoint.json = setFieldInOrder(
        entrypoint.json,
        field,
        validFields[field](entrypoint)
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
