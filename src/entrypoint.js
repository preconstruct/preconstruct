// @flow

/*:: 
import { Package } from './package'
*/
import path from "path";
import { MissingEntrypoint } from "./errors";
import is from "sarcastic";
import * as fs from "fs-extra";

let unsafeRequire = require;

let objectOfString = is.objectOf(is.string);

export class Entrypoint {
  pkg: Package;
  json: Object;
  _config: Object;
  directory: string;
  pathname: string;
  constructor(directory: string, pkg: Package) {
    this.pkg = pkg;
    this.directory = directory;
    this.pathname = path.join(directory, "package.json");
    try {
      this.json = unsafeRequire(this.pathname);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        throw new MissingEntrypoint(
          `Missing package.json for entrypoint at ${directory}`
        );
      }
      throw e;
    }
    this._config = this.json.preconstruct || {};
  }
  async refresh() {
    let contents: string = await fs.readFile(this.pathname, "utf-8");
    this.json = is(JSON.parse(contents), is.object);
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
    return is(
      this.json.browser,
      is.maybe(is.either(is.string, objectOfString))
    );
  }
  set browser(option: string | { [key: string]: string }) {
    this.json.browser = option;
  }
  get reactNative(): null | string | { [key: string]: string } {
    return is(
      this.json["react-native"],
      is.maybe(is.either(is.string, objectOfString))
    );
  }
  set reactNative(option: string | { [key: string]: string }) {
    this.json["react-native"] = option;
  }
  get umdMain(): string | null {
    return is(this.json["umd:main"], is.maybe(is.string));
  }
  set umdMain(path: string) {
    this.json["umd:main"] = path;
  }
  get umdName(): null | string {
    return is(this._config.umdName, is.maybe(is.string));
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
  get source(): string {
    return path.join(this.directory, "src", "index.js");
  }
  async strict() {
    await validateEntrypoint(this);
  }
}

class StrictEntrypoint extends Entrypoint {
  get main(): string | null {
    return is(this.json.main, is.maybe(is.string));
  }
  set main(path: string) {
    this.json.main = path;
  }
}
