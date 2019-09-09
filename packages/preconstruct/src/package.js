// @flow
// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import is from "sarcastic";
import globby from "globby";
import * as fs from "fs-extra";
import nodePath from "path";
import { Item } from "./item";
import { FatalError } from "./errors";
import { Entrypoint, StrictEntrypoint } from "./entrypoint";
import {
  getValidObjectFieldContentForBuildType,
  getValidStringFieldContentForBuildType
} from "./utils";
import { errors, confirms } from "./messages";

/*::
import {Project} from './project'
*/

export class Package extends Item {
  project: Project;
  entrypoints: Array<Entrypoint>;
  get configEntrypoints(): Array<string> {
    return is(
      this._config.entrypoints,
      is.default(is.arrayOf(is.string), ["."])
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

        return { filename, contents };
      })
    ).then(descriptors => {
      let getPlainEntrypointContent = () => {
        let plainEntrypointObj: Object = {
          main: getValidStringFieldContentForBuildType("main", pkg.name)
        };
        for (let descriptor of descriptors) {
          if (descriptor.contents !== null) {
            let parsed = JSON.parse(descriptor.contents);
            for (let field of ["module", "umd:main", "types"]) {
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
        let plainEntrypointContents = JSON.stringify(plainEntrypointObj);
        getPlainEntrypointContent = () => plainEntrypointContents;
        return plainEntrypointContents;
      };

      return Promise.all(
        descriptors.map(async ({ filename, contents }) => {
          if (contents === null) {
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
            contents = getPlainEntrypointContent();
            await fs.writeFile(filename, contents);
          }
          return new Entrypoint(filename, contents, pkg);
        })
      );
    });

    return pkg;
  }

  setFieldOnEntrypoints(field: "main" | "browser" | "module" | "umdMain" | "types") {
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
        case "types": {
          entrypoint.types = getValidStringFieldContentForBuildType(
            "types",
            this.name
          );
          break;
        }
      }
    });
  }

  get name(): string {
    return is(this.json.name, is.string);
  }
  set name(name: string) {
    this.json.name = name;
  }

  get dependencies(): null | { [key: string]: string } {
    return is(this.json.dependencies, is.maybe(is.objectOf(is.string)));
  }
  get peerDependencies(): null | { [key: string]: string } {
    return is(this.json.peerDependencies, is.maybe(is.objectOf(is.string)));
  }
}

export class StrictPackage extends Package {
  strictEntrypoints: Array<StrictEntrypoint>;
}
