// @flow
// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
let is = require("sarcastic");
let nodePath = require("path");
let fs = require("fs-extra");

// $FlowFixMe
let objectOfString = is.objectOf(is.string);

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
  static async create(filePath /*:string*/) {
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
  async save() {
    await fs.writeFile(this.path, JSON.stringify(this.json, null, 2));
  }
};
