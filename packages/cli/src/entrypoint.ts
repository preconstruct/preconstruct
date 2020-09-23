import nodePath from "path";
import { Item } from "./item";
import resolve from "resolve";
import { EXTENSIONS } from "./constants";
import { Package } from "./package";
import { FatalError } from "./errors";
import { JSONValue } from "./utils";

export class Entrypoint extends Item<{
  main?: JSONValue;
  module?: JSONValue;
  "umd:main"?: JSONValue;
  browser?: JSONValue;
  preconstruct: {
    source?: JSONValue;
    umdName?: JSONValue;
  };
}> {
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

  get configSource(): string {
    if (this.package.project.experimentalFlags.newEntrypoints) {
      if (this.json.preconstruct.source !== undefined) {
        throw new FatalError(
          "The source option is not allowed with the newEntrypoints experimental flag",
          this.name
        );
      }
      return nodePath.relative(
        this.directory,
        nodePath.join(
          this.package.directory,
          "src",
          nodePath.relative(this.package.directory, this.directory)
        )
      );
    }
    if (
      this.json.preconstruct.source !== undefined &&
      typeof this.json.preconstruct.source !== "string"
    ) {
      throw new FatalError(
        "The source option for this entrypoint is not a string",
        this.name
      );
    }
    if (this.json.preconstruct.source === undefined) {
      return "src/index";
    }
    return this.json.preconstruct.source;
  }
  _sourceCached?: string;
  get source(): string {
    if (this._sourceCached === undefined) {
      this._sourceCached = resolve.sync(
        nodePath.join(this.directory, this.configSource),
        {
          extensions: EXTENSIONS,
        }
      );
    }
    return this._sourceCached;
  }
  updater(json: typeof Entrypoint.prototype.json) {
    super.updater(json);
    this._sourceCached = undefined;
  }
}
