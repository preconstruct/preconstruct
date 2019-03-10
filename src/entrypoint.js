// @flow

/*:: 
import { Package } from './package'
*/
import path from "path";
import { MissingEntrypoint } from "./errors";
import is from "sarcastic";

let unsafeRequire = require;

let objectOfString = is.objectOf(is.string);

export class Entrypoint {
  pkg: Package;
  json: Object;
  _config: Object;
  constructor(directory: string, pkg: Package) {
    this.pkg = pkg;
    try {
      this.json = unsafeRequire(path.join(directory, "package.json"));
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
}
