import nodePath from "path";
import { validateEntrypoint } from "./validate";
import { Item } from "./item";
import { validatePackage } from "./validate-package";
import resolve from "resolve";
import { EXTENSIONS } from "./constants";
import { Package } from "./package";
import { FatalError } from "./errors";

let fields = [
  "version",
  "description",
  "main",
  "module",
  "umd:main",
  "browser"
];

function setFieldInOrder(
  obj: { [key: string]: any },
  field: "main" | "module" | "umd:main" | "browser",
  value: any
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

  let newObj: { [key: string]: any } = {};

  for (let key in obj) {
    newObj[key] = obj[key];

    if (key === idealField) {
      newObj[field] = value;
    }
  }

  return newObj;
}

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
    if (this.json.main == null || typeof this.json.main === "string") {
      return this.json.main === undefined ? null : this.json.main;
    }
    throw new FatalError(
      "This entrypoint has a main field that exists but is not a string",
      this.name
    );
  }
  set main(path: string | null) {
    this.json = setFieldInOrder(this.json, "main", path);
  }
  get module(): string | null {
    if (this.json.module == null || typeof this.json.module === "string") {
      return this.json.module === undefined ? null : this.json.module;
    }
    throw new FatalError(
      "This entrypoint has a module field that exists but is not a string",
      this.name
    );
  }
  set module(path: string | null) {
    this.json = setFieldInOrder(this.json, "module", path);
  }
  get browser(): null | string | { [key: string]: string } {
    if (
      this.json.browser == null ||
      typeof this.json.browser === "string" ||
      typeof this.json.browser === "object"
    ) {
      return this.json.browser === undefined ? null : this.json.browser;
    }
    throw new FatalError(
      "This entrypoint has a browser field that exists but it is not a string or an object",
      this.name
    );
  }
  set browser(option: { [key: string]: string } | string | null) {
    this.json = setFieldInOrder(this.json, "browser", option);
  }

  get umdMain(): string | null {
    if (
      this.json["umd:main"] == null ||
      typeof this.json["umd:main"] === "string"
    ) {
      return this.json["umd:main"] === undefined ? null : this.json["umd:main"];
    }
    throw new FatalError(
      "This entrypoint has a umd:main field that exists but it is not a string",
      this.name
    );
  }
  set umdMain(path: string | null) {
    this.json = setFieldInOrder(this.json, "umd:main", path);
  }

  get configSource(): string {
    if (
      this._config.source !== null &&
      typeof this._config.source !== "string"
    ) {
      throw new FatalError(
        "The source option for this entrypoint is not a string",
        this.name
      );
    }
    if (this._config.source == null) {
      return "src/index";
    }
    return this._config.source;
  }

  get source(): string {
    return resolve.sync(nodePath.join(this.directory, this.configSource), {
      extensions: EXTENSIONS
    });
  }
  get umdName(): null | string {
    if (
      this._config.umdName == null ||
      typeof this._config.umdName === "string"
    ) {
      return this._config.umdName === undefined ? null : this._config.umdName;
    }
    throw new FatalError(
      "This entrypoint has a umd:main field that exists but it is not a string",
      this.name
    );
  }
  set umdName(umdName: null | string) {
    if (umdName === null) {
      delete this._config.umdName;
    } else {
      this._config.umdName = umdName;
    }
  }

  _strict: StrictEntrypoint | undefined;
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
    if (typeof this.json.main === "string") {
      return this.json.main;
    }
    throw new FatalError(
      "This entrypoint's main field is not a string",
      this.name
    );
  }
  set main(path: string) {
    this.json = setFieldInOrder(this.json, "main", path);
  }
  get browser(): null | { [key: string]: string } {
    if (this.json.browser == null || typeof this.json.browser === "object") {
      return this.json.browser === undefined ? null : this.json.browser;
    }
    throw new FatalError(
      "This entrypoint has a browser field that exists but it is not an object",
      this.name
    );
  }
  set browser(option: { [key: string]: string } | null) {
    this.json = setFieldInOrder(this.json, "browser", option);
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
