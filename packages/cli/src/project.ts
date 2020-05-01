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

const allSettled = (promises: Promise<any>[]) =>
  Promise.all(
    promises.map(promise =>
      promise.then(
        value => ({ status: "fulfilled" as const, value }),
        reason => ({ status: "rejected" as const, reason })
      )
    )
  );

export class Project extends Item {
  get experimentalFlags() {
    let config = this._config.___experimentalFlags_WILL_CHANGE_IN_PATCH || {};
    return {
      newEntrypoints: !!config.newEntrypoints,
      useSourceInsteadOfGeneratingTSDeclarations: !!config.useSourceInsteadOfGeneratingTSDeclarations
    };
  }
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

    let packages: Package[] = [];

    await Promise.all(
      filenames.map(async x => {
        try {
          packages.push(await Package.create(x, this));
        } catch (err) {
          if (
            err.code === "ENOENT" &&
            err.path === nodePath.join(x, "package.json")
          ) {
            return;
          }
          throw err;
        }
      })
    );

    const errored = (
      await allSettled(packages.map(pkg => validateIncludedFiles(pkg)))
    ).find(result => result.status === "rejected");

    if (errored) {
      // TS can't refine type based on .find predicate
      throw (errored as any).reason;
    }

    return packages;
  }
}
