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
  validFieldsFromPkgName,
  setFieldInOrder,
  JSONValue,
} from "./utils";

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
  static async create(directory: string, project: Project): Promise<Package> {
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
      pkg.entrypoints = await Promise.all(
        entrypoints.map(async (sourceFile) => {
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

          return { filename, directory, contents, hasAccepted: false };
        })
      ).then(async (descriptors) => {
        let getPlainEntrypointContent = () => {
          let plainEntrypointObj: {
            [key: string]: string | Record<string, string>;
          } = {
            main: validFieldsFromPkgName.main(pkg.name),
          };
          for (let descriptor of descriptors) {
            if (descriptor.contents !== undefined) {
              let parsed = jsonParse(descriptor.contents, descriptor.filename);
              for (let field of ["module", "umd:main"] as const) {
                if (parsed[field] !== undefined) {
                  plainEntrypointObj[field] = validFieldsFromPkgName[field](
                    pkg.name
                  );
                }
              }
              if (parsed.browser !== undefined) {
                plainEntrypointObj.browser = validFieldsFromPkgName.browser(
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

        return Promise.all(
          descriptors.map(
            async ({ filename, directory, contents, hasAccepted }) => {
              if (contents === undefined || hasAccepted) {
                if (!hasAccepted) {
                  let shouldCreateEntrypointPkgJson = await confirms.createEntrypointPkgJson(
                    {
                      name: nodePath.join(
                        pkg.name,
                        nodePath.relative(pkg.directory, directory)
                      ),
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
                await fs.outputFile(filename, contents);
              }
              return new Entrypoint(filename, contents, pkg);
            }
          )
        );
      });
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
        let getPlainEntrypointContent = () => {
          let plainEntrypointObj: {
            [key: string]: string | Record<string, string>;
          } = {
            main: validFieldsFromPkgName.main(pkg.name),
          };
          for (let descriptor of descriptors) {
            if (descriptor.contents !== undefined) {
              let parsed = jsonParse(descriptor.contents, descriptor.filename);
              for (let field of ["module", "umd:main"] as const) {
                if (parsed[field] !== undefined) {
                  plainEntrypointObj[field] = validFieldsFromPkgName[field](
                    pkg.name
                  );
                }
              }
              if (parsed.browser !== undefined) {
                plainEntrypointObj.browser = validFieldsFromPkgName.browser(
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

        return Promise.all(
          descriptors.map(async ({ filename, contents, hasAccepted }) => {
            if (contents === undefined || hasAccepted) {
              if (!hasAccepted) {
                let shouldCreateEntrypointPkgJson = await confirms.createEntrypointPkgJson(
                  {
                    name: nodePath.join(
                      pkg.name,
                      nodePath.relative(pkg.directory, directory)
                    ),
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
  set name(name: string) {
    this.json.name = name;
  }
}
