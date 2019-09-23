import nodePath from "path";
import { promptInput } from "./prompt";
import pLimit from "p-limit";
import resolveFrom from "resolve-from";
import globby from "globby";
import * as fs from "fs-extra";
import { Item } from "./item";
import { Package } from "./package";
import { error } from "./logger";
import { promptConfirm } from "./prompt";
import { PKG_JSON_CONFIG_FIELD } from "./constants";
import { validateIncludedFiles } from "./validate-included-files";
import { FatalError } from "./errors";

let unsafeRequire = require;

let askGlobalLimit = pLimit(1);

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
  // probably gonna be irrelevant later but i want it for now
  get isBolt(): boolean {
    // we only want to return true when there is bolt config
    // AND no yarn workspaces config
    // because emotion has a bolt config and yarn workspaces
    // and if you have both, you probably want workspaces
    let hasBolt = !!this.json.bolt;
    let hasYarnWorkspaces = !!this.json.workspaces;
    return hasBolt && !hasYarnWorkspaces;
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

  global(pkg: string) {
    if (this._config.globals !== undefined && this._config.globals[pkg]) {
      return this._config.globals[pkg];
    } else {
      try {
        let pkgJson = unsafeRequire(
          resolveFrom(this.directory, nodePath.join(pkg, "package.json"))
        );
        if (
          pkgJson &&
          pkgJson[PKG_JSON_CONFIG_FIELD] &&
          pkgJson[PKG_JSON_CONFIG_FIELD].umdName
        ) {
          return pkgJson[PKG_JSON_CONFIG_FIELD].umdName;
        }
      } catch (err) {
        if (err.code !== "MODULE_NOT_FOUND") {
          throw err;
        }
      }
      throw askGlobalLimit(() =>
        (async () => {
          // if while we were waiting, that global was added, return
          if (this._config.globals !== undefined && this._config.globals[pkg]) {
            return;
          }
          let response = await promptInput(
            `What should the umdName of ${pkg} be?`,
            this
          );
          this._addGlobal(pkg, response);
          await this.save();
        })()
      );
    }
  }

  _addGlobal(pkg: string, name: string) {
    if (!this._config.globals) {
      this._config.globals = {};
    }
    this._config.globals[pkg] = name;
  }
}
