import nodePath from "path";
import { promptInput } from "./prompt";
import globby from "globby";
import * as fs from "fs-extra";
import { Item } from "./item";
import { Package } from "./package";
import { error } from "./logger";
import { promptConfirm } from "./prompt";
import { validateIncludedFiles } from "./validate-included-files";
import { FatalError } from "./errors";

export class Project extends Item {
  get configPackages(): Array<string> {
    if (this._config.packages == null) {
      return ["."];
    }
    if (
      Array.isArray(this._config.packages) &&
      this._config.packages.every(x => typeof x === "string")
    ) {
      return this._config.packages;
    }

    throw new FatalError(
      "The packages option for this project is not an array of globs",
      this.name
    );
  }
  static async create(directory: string): Promise<Project> {
    let filePath = nodePath.join(directory, "package.json");
    let contents = await fs.readFile(filePath, "utf-8");
    let project = new Project(filePath, contents);
    project.packages = await project._packages();

    return project;
  }

  get name(): string {
    if (typeof this.json.name !== "string") {
      throw new FatalError(
        "The name field on this project is not a string",
        this.directory
      );
    }
    return this.json.name;
  }
  set name(name: string) {
    this.json.name = name;
  }
  packages!: Array<Package>;

  async _packages(): Promise<Array<Package>> {
    // suport bolt later probably
    // maybe lerna too though probably not
    if (!this._config.packages && this.json.workspaces) {
      let workspaces;
      if (Array.isArray(this.json.workspaces)) {
        workspaces = this.json.workspaces;
      } else if (Array.isArray(this.json.workspaces.packages)) {
        workspaces = this.json.workspaces.packages;
      }

      let packages = await promptInput(
        "what packages should preconstruct build?",
        this,
        workspaces.join(",")
      );

      this._config.packages = packages.split(",");

      await this.save();
    }

    let filenames = await globby(this.configPackages, {
      cwd: this.directory,
      onlyDirectories: true,
      absolute: true,
      expandDirectories: false
    });

    let dirsWithoutPkgJson: string[] = [];
    let lastErr;

    let packages = await Promise.all(
      filenames.map(async x => {
        try {
          let pkg = await Package.create(x);
          pkg.project = this;
          return pkg;
        } catch (err) {
          if (
            err.code === "ENOENT" &&
            err.path === nodePath.join(x, "package.json")
          ) {
            lastErr = err;
            dirsWithoutPkgJson.push(x);
            return (undefined as any) as Package;
          }
          throw err;
        }
      })
    );
    if (dirsWithoutPkgJson.length) {
      error(
        "there are some package directories that do not have package.jsons\nthis is often caused by switching branches.\n\n" +
          dirsWithoutPkgJson.join("\n") +
          "\n"
      );
      if (
        !(await promptConfirm(
          "would you like preconstruct to delete these directories automatically?"
        ))
      ) {
        throw lastErr;
      }
      await Promise.all(dirsWithoutPkgJson.map(dir => fs.remove(dir)));
      return this._packages();
    }

    await Promise.all(packages.map(pkg => validateIncludedFiles(pkg)));
    return packages;
  }
}
