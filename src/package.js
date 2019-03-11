// @flow
// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import is from "sarcastic";
import nodePath from "path";
import { validatePackage } from "./validate";
import { Item } from "./item";
/*::
import {Project} from './project'
*/

let objectOfString = is.objectOf(is.string);

export class Package extends Item {
  project: Project;

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
  get dependencies(): null | { [key: string]: string } {
    return is(this.json.dependencies, is.maybe(objectOfString));
  }
  get peerDependencies(): null | { [key: string]: string } {
    return is(this.json.peerDependencies, is.maybe(objectOfString));
  }

  get umdMain(): string | null {
    return is(this.json["umd:main"], is.maybe(is.string));
  }
  set umdMain(path: string) {
    this.json["umd:main"] = path;
  }
  get source(): string {
    return nodePath.join(this.directory, "src", "index.js");
  }
  get undName(): null | string {
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

  _strict: StrictPackage;
  strict(): StrictPackage {
    validatePackage(this, false);
    if (!this._strict) {
      this._strict = new StrictPackage(this.path, this._contents);
      this._strict.project = this.project;
    }
    return this._strict;
  }
}

export class StrictPackage extends Package {
  get main(): string {
    return is(this.json.main, is.string);
  }
  set main(path: string) {
    this.json.main = path;
  }
  updater(json: Object) {
    super.updater(json);
    validatePackage(this, false);
  }
}
