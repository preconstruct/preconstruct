// @flow
// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
let is = require("sarcastic");
let nodePath = require("path");
let fs = require("fs-extra");
let globby /*: (
  globs: string | Array<string>,
  options: Object
) => Promise<Array<string>> */ = require("globby");

// $FlowFixMe
let objectOfString = is.objectOf(is.string);

// $FlowixMe
let arrayOfString = is.arrayOf(is.string);

module.exports = class Package {
  /*:: 
  json: Object;
  path: string;
  directory: string;
  */
  constructor(filePath /*: string*/, contents /*: string*/) {
    this.json = is(JSON.parse(contents), is.object);
    this.path = filePath;
    this.directory = nodePath.dirname(filePath);
  }
  static async create(directory /*:string*/) {
    let filePath = nodePath.join(directory, "package.json");
    let contents /*: string*/ = await fs.readFile(filePath, "utf-8");
    return new Package(filePath, contents);
  }
  get name() {
    return is(this.json.name, is.string);
  }
  set name(name /*: string */) {
    this.json.name = name;
  }
  get main() {
    return is(this.json.main, is.maybe(is.string));
  }
  set main(path /*: string */) {
    this.json.main = path;
  }
  get module() {
    return is(this.json.module, is.maybe(is.string));
  }
  set module(path /*: string */) {
    this.json.module = path;
  }
  get browser() {
    return is(this.json.module, is.maybe(is.either(is.string, objectOfString)));
  }
  set browser(option /*: string | { [key: string]: string } */) {
    this.json.module = option;
  }
  get config() {
    // in the future we might want to merge from parent configs
    return is(
      this.json.preconstruct,
      is.default(is.shape({ packages: is.maybe(arrayOfString) }), {
        packages: null
      })
    );
  }
  get configPackages() {
    return is(this.config.packages, arrayOfString);
  }
  async packages() /*: Promise<null | Array<Package>>*/ {
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
  async save() {
    await fs.writeFile(this.path, JSON.stringify(this.json, null, 2));
  }
};
