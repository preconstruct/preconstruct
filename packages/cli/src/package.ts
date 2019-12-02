// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import globby from "globby";
import * as fs from "fs-extra";
import nodePath from "path";
import { Item } from "./item";
import { FatalError } from "./errors";
import { Entrypoint } from "./entrypoint";
import jsonParse from "parse-json";

import {
  getValidObjectFieldContentForBuildType,
  getValidStringFieldContentForBuildType
} from "./utils";
import { errors, confirms } from "./messages";
import { Project } from "./project";
import { getUselessGlobsThatArentReallyGlobs } from "./glob-thing";
import detectIndent from "detect-indent";

export class Package extends Item {
  project!: Project;
  entrypoints!: Array<Entrypoint>;
  get configEntrypoints(): Array<string> {
    if (this._config.entrypoints == null) {
      return ["."];
    }
    if (
      Array.isArray(this._config.entrypoints) &&
      this._config.entrypoints.every(x => typeof x === "string")
    ) {
      return this._config.entrypoints;
    }

    throw new FatalError(
      "The entrypoints option for this packages is not an array of globs",
      this.name
    );
  }
  static async create(directory: string): Promise<Package> {
    let filePath = nodePath.join(directory, "package.json");

    let contents = await fs.readFile(filePath, "utf-8");
    let pkg = new Package(filePath, contents);

    let entrypointDirectories = await globby(pkg.configEntrypoints, {
      cwd: pkg.directory,
      onlyDirectories: true,
      absolute: true,
      expandDirectories: false
    });

    pkg.entrypoints = await Promise.all(
      entrypointDirectories.map(async directory => {
        let filename = nodePath.join(directory, "package.json");

        let contents = null;

        try {
          contents = await fs.readFile(filename, "utf-8");
        } catch (e) {
          if (e.code !== "ENOENT") {
            throw e;
          }
        }

        return { filename, contents, hasAccepted: false };
      })
    ).then(async descriptors => {
      let getPlainEntrypointContent = () => {
        let plainEntrypointObj: {
          [key: string]: string | Record<string, string>;
        } = {
          main: getValidStringFieldContentForBuildType("main", pkg.name)
        };
        for (let descriptor of descriptors) {
          if (descriptor.contents !== null) {
            let parsed = jsonParse(descriptor.contents, descriptor.filename);
            for (let field of ["module", "umd:main"] as const) {
              if (parsed[field] !== undefined) {
                plainEntrypointObj[
                  field
                ] = getValidStringFieldContentForBuildType(field, pkg.name);
              }
            }
            if (parsed.browser !== undefined) {
              plainEntrypointObj.browser = getValidObjectFieldContentForBuildType(
                "browser",
                pkg.name,
                plainEntrypointObj.module !== undefined
              );
            }
          }
        }
        let plainEntrypointContents =
          JSON.stringify(
            plainEntrypointObj,
            null,
            detectIndent(contents).indent || "  "
          ) + "\n";
        getPlainEntrypointContent = () => plainEntrypointContents;
        return plainEntrypointContents;
      };

      let globErrors = await getUselessGlobsThatArentReallyGlobs(
        pkg.configEntrypoints,
        pkg.directory
      );

      if (globErrors.some(x => x !== undefined)) {
        await Promise.all(
          globErrors.map(async (globError, index) => {
            if (globError !== undefined) {
              let shouldCreateEntrypoint = await confirms.createEntrypoint({
                name: nodePath.join(
                  pkg.name,
                  nodePath.relative(pkg.directory, globError)
                )
              });
              if (shouldCreateEntrypoint) {
                descriptors.push({
                  contents: null,
                  filename: nodePath.resolve(
                    pkg.directory,
                    globError,
                    "package.json"
                  ),
                  hasAccepted: true
                });
                await fs.mkdirp(globError);
              } else {
                delete pkg._config.entrypoints[index];
              }
            }
          })
        );
        pkg._config.entrypoints = pkg._config.entrypoints.filter(
          (x: string | undefined) => x
        );
        await pkg.save();
      }

      return Promise.all(
        descriptors.map(async ({ filename, contents, hasAccepted }) => {
          if (contents === null || hasAccepted) {
            if (!hasAccepted) {
              let shouldCreateEntrypointPkgJson = await confirms.createEntrypointPkgJson(
                {
                  name: nodePath.join(
                    pkg.name,
                    nodePath.relative(pkg.directory, directory)
                  )
                }
              );
              if (!shouldCreateEntrypointPkgJson) {
                throw new FatalError(
                  errors.noEntrypointPkgJson,
                  nodePath.join(
                    pkg.name,
                    nodePath.relative(pkg.directory, directory)
                  )
                );
              }
            }
            contents = getPlainEntrypointContent();
            await fs.writeFile(filename, contents);
          }
          return new Entrypoint(filename, contents, pkg);
        })
      );
    });

    return pkg;
  }

  setFieldOnEntrypoints(field: "main" | "browser" | "module" | "umdMain") {
    this.entrypoints.forEach(entrypoint => {
      switch (field) {
        case "main": {
          entrypoint.main = getValidStringFieldContentForBuildType(
            "main",
            this.name
          );
          break;
        }
        case "module": {
          entrypoint.module = getValidStringFieldContentForBuildType(
            "module",
            this.name
          );
          break;
        }
        case "browser": {
          entrypoint.browser = getValidObjectFieldContentForBuildType(
            "browser",
            this.name,
            entrypoint.module !== null
          );
          break;
        }
        case "umdMain": {
          entrypoint.umdMain = getValidStringFieldContentForBuildType(
            "umd:main",
            this.name
          );
          break;
        }
      }
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
  set name(name: string) {
    this.json.name = name;
  }
}
