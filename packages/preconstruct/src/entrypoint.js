// @flow
import is from "sarcastic";
import nodePath from "path";
import { validateEntrypoint } from "./validate";
import { Item } from "./item";
import { validatePackage } from "./validate-package";
import resolve from "resolve";
import { EXTENSIONS } from "./constants";

let fields = [
  "version",
  "description",
  "license",
  "main",
  "module",
  "umd:main",
  "browser",
  "react-native",
  "types"
];
// TODO: fix this, i'm pretty sure it's slightly broken
function setFieldInOrder(
  obj,
  field: "main" | "module" | "umd:main" | "browser" | "react-native" | "types",
  value
) {
  if (field in obj) {
    return { ...obj, [field]: value };
  }
  let fieldIndex = fields.indexOf(field);
  let idealField = fields
    .slice(0, fieldIndex)
    .reverse()
    .find(key => {
      return key in obj;
    });

  if (idealField === undefined) {
    return { ...obj, [field]: value };
  }

  let newObj = {};

  for (let key in obj) {
    newObj[key] = obj[key];

    if (key === idealField) {
      newObj[field] = value;
    }
  }

  return newObj;
}

/*::
import { Package } from './package'
*/

export class Entrypoint extends Item {
  package: Package;

  constructor(filePath: string, contents: string, pkg: Package) {
    super(filePath, contents);
    this.package = pkg;
  }

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
    this.json = setFieldInOrder(this.json, "main", path);
  }
  get module(): string | null {
    return is(this.json.module, is.maybe(is.string));
  }
  set module(path: string) {
    this.json = setFieldInOrder(this.json, "module", path);
  }
  get browser(): null | string | { [key: string]: string } {
    return is(
      this.json.browser,
      is.maybe(is.either(is.string, is.objectOf(is.string)))
    );
  }
  set browser(option: { [key: string]: string }) {
    this.json = setFieldInOrder(this.json, "browser", option);
  }
  get reactNative(): null | string | { [key: string]: string } {
    return is(
      this.json["react-native"],
      is.maybe(is.either(is.string, is.objectOf(is.string)))
    );
  }
  set reactNative(option: { [key: string]: string }) {
    this.json = setFieldInOrder(this.json, "react-native", option);
  }

  get umdMain(): string | null {
    return is(this.json["umd:main"], is.maybe(is.string));
  }
  set umdMain(path: string) {
    this.json = setFieldInOrder(this.json, "umd:main", path);
  }

  get tsTypes(): string | null {
    return is(this.json["types"], is.maybe(is.string));
  }
  set tsTypes(path: string) {
    this.json = setFieldInOrder(this.json, "types", path);
  }

  get configSource(): string {
    return is(this._config.source, is.default(is.string, "src/index"));
  }

  get source(): string {
    return resolve.sync(nodePath.join(this.directory, this.configSource), {
      extensions: EXTENSIONS
    });
  }
  get umdName(): null | string {
    return is(this._config.umdName, is.maybe(is.string));
  }
  set umdName(umdName: null | string) {
    if (umdName === null) {
      delete this._config.umdName;
    } else {
      this._config.umdName = umdName;
    }
  }

  _strict: StrictEntrypoint;
  strict(): StrictEntrypoint {
    if (!this._strict) {
      validatePackage(this.package);
      validateEntrypoint(this, false);
      this._strict = new StrictEntrypoint(
        this.path,
        this._contents,
        this.package
      );
    }
    return this._strict;
  }
}

export class StrictEntrypoint extends Entrypoint {
  get main(): string {
    return is(this.json.main, is.string);
  }
  set main(path: string) {
    this.json = setFieldInOrder(this.json, "main", path);
  }
  get browser(): null | { [key: string]: string } {
    return is(this.json.browser, is.maybe(is.objectOf(is.string)));
  }
  set browser(option: { [key: string]: string }) {
    this.json = setFieldInOrder(this.json, "browser", option);
  }
  get reactNative(): null | { [key: string]: string } {
    return is(this.json["react-native"], is.maybe(is.objectOf(is.string)));
  }
  set reactNative(option: { [key: string]: string }) {
    this.json = setFieldInOrder(this.json, "react-native", option);
  }
  updater(json: Object) {
    super.updater(json);
    validatePackage(this.package);
    validateEntrypoint(this, false);
  }
  strict() {
    return this;
  }
}
