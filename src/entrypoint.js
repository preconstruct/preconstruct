// @flow
import is from "sarcastic";
import nodePath from "path";
import { validateEntrypoint } from "./validate";
import { Item } from "./item";
/*::
import { Package } from './package'
*/

export class Entrypoint extends Item {
  package: Package;

  get name(): string {
    return nodePath.join(
      this.package.name,
      nodePath.relative(this.package.directory, this.directory)
    );
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
      is.maybe(is.either(is.string, is.objectOf(is.string)))
    );
  }
  set browser(option: string | { [key: string]: string }) {
    this.json.browser = option;
  }
  get reactNative(): null | string | { [key: string]: string } {
    return is(
      this.json["react-native"],
      is.maybe(is.either(is.string, is.objectOf(is.string)))
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
  get source(): string {
    let source = is(this._config.source, is.default(is.string, "src"));
    return require.resolve(nodePath.join(this.directory, source));
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

  _strict: StrictEntrypoint;
  strict(): StrictEntrypoint {
    validateEntrypoint(this, false);
    if (!this._strict) {
      this._strict = new StrictEntrypoint(this.path, this._contents);
      this._strict.package = this.package;
    }
    return this._strict;
  }
}

export class StrictEntrypoint extends Entrypoint {
  get main(): string {
    return is(this.json.main, is.string);
  }
  set main(path: string) {
    this.json.main = path;
  }
  updater(json: Object) {
    super.updater(json);
    validateEntrypoint(this, false);
  }
}
