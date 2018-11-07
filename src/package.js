// @flow
// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import is from "sarcastic";
import nodePath from "path";
import * as fs from "fs-extra";
import { validatePackage } from "./validate";
// move this to the flow-typed folder later
let globby: (
  globs: string | Array<string>,
  options: Object
) => Promise<Array<string>> = require("globby");

let objectOfString = is.objectOf(is.string);

let arrayOfString = is.arrayOf(is.string);

export class Package {
  json: Object;
  path: string;
  directory: string;
  _contents: string;
  constructor(filePath: string, contents: string) {
    this.json = is(JSON.parse(contents), is.object);
    this._contents = contents;
    this.path = filePath;
    this.directory = nodePath.dirname(filePath);
  }
  static async create(directory: string): Promise<Package> {
    let filePath = nodePath.join(directory, "package.json");
    let contents: string = await fs.readFile(filePath, "utf-8");
    return new Package(filePath, contents);
  }
  get name(): string {
    return is(this.json.name, is.string);
  }
  set name(name: string) {
    this.json.name = name;
  }
  get main(): string | null {
    return is(this.json.main, is.maybe(is.string));
  }
  set main(path: string) {
    this.json.main = path;
  }
  get module(): string | null {
    return is(this.json.module, is.maybe(is.string));
  }
  set module(path: string) {
    this.json.module = path;
  }
  get browser(): null | string | { [key: string]: string } {
    return is(this.json.module, is.maybe(is.either(is.string, objectOfString)));
  }
  set browser(option: string | { [key: string]: string }) {
    this.json.module = option;
  }
  get dependencies(): null | { [key: string]: string } {
    return is(this.json.dependencies, is.maybe(objectOfString));
  }
  get peerDependencies(): null | { [key: string]: string } {
    return is(this.json.peerDependencies, is.maybe(objectOfString));
  }

  get config(): { packages: null | Array<string>, umdName: string | null } {
    // in the future we might want to merge from parent configs
    return is(
      this.json.preconstruct,
      is.default(
        is.shape({
          packages: is.maybe(arrayOfString),
          umdName: is.maybe(is.string)
        }),
        {
          packages: null,
          umdName: null
        }
      )
    );
  }

  get configPackages(): Array<string> {
    return is(this.config.packages, arrayOfString);
  }

  get umdMain(): string | null {
    return is(this.json["umd:main"], is.maybe(is.string));
  }
  set umdMain(path: string) {
    this.json["umd:main"] = path;
  }
  get undName(): null | string {
    return this.config.umdName;
  }
  set umdName(umdName: null | string) {
    if (umdName === null) {
      delete this.json.preconstruct.umdName;
      if (Object.keys(this.json.preconstruct).length === 0) {
        delete this.json.preconstruct;
      }
    }
    if (!this.json.preconstruct) {
      this.json.preconstruct = {};
    }
    this.json.preconstruct.umdName = umdName;
  }

  async packages(): Promise<null | Array<Package>> {
    // support yarn workspaces later
    // probably bolt too
    // maybe lerna though probably not
    // also support packages option in preconstruct config
    // if (!this.json.workspaces) {
    //   return null;
    // }
    // let _workspaces;
    // if (Array.isArray(this.json.workspaces)) {
    //   _workspaces = this.json.workspaces;
    // } else if (Array.isArray(this.json.workspaces.packages)) {
    //   _workspaces = this.json.workspaces.packages;
    // }
    // // $FlowFixMe
    // let workspaces = is(_workspaces, is.arrayOf(is.string));

    // for now, only the config option, this is what emotion needs anyway
    try {
      let filenames = await globby(this.configPackages, {
        cwd: this.directory,
        onlyDirectories: true,
        absolute: true
      });

      let packages = await Promise.all(filenames.map(Package.create));
      return packages;
    } catch (error) {
      if (error instanceof is.AssertionError) {
        return null;
      }
      throw error;
    }
  }
  strict(): StrictPackage {
    validatePackage(this);
    return new StrictPackage(this.path, this._contents);
  }
  async save() {
    await fs.writeFile(this.path, JSON.stringify(this.json, null, 2));
  }
}

export class StrictPackage extends Package {
  get main(): string {
    return is(this.json.main, is.string);
  }
  set main(path: string) {
    this.json.main = path;
  }
}
