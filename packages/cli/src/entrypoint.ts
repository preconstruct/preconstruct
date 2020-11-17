import nodePath from "path";
import { Item } from "./item";
import resolve from "resolve";
import { EXTENSIONS } from "./constants";
import { Package } from "./package";
import { FatalError } from "./errors";
import { JSONValue } from "./utils";
import normalizePath from "normalize-path";

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
  _newEntrypointsSource: string | undefined;
  constructor(
    filePath: string,
    contents: string,
    pkg: Package,
    source?: string
  ) {
    super(filePath, contents, pkg._jsonDataByPath);
    this.package = pkg;
    this._newEntrypointsSource = source;
  }

  get name(): string {
    return normalizePath(
      nodePath.join(
        this.package.name,
        nodePath.relative(this.package.directory, this.directory)
      )
    );
  }

  get configSource(): string {
    if (this.package.project.experimentalFlags.newEntrypoints) {
      return nodePath.relative(
        this.directory,
        nodePath.relative(this.package.directory, this._newEntrypointsSource!)
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
  _sourceCached?: { value: string; configSource: string };
  get source(): string {
    if (this._newEntrypointsSource !== undefined) {
      return this._newEntrypointsSource;
    }
    if (this._sourceCached?.configSource !== this.configSource) {
      this._sourceCached = {
        configSource: this.configSource,
        value: resolve.sync(nodePath.join(this.directory, this.configSource), {
          extensions: EXTENSIONS,
        }),
      };
    }
    return this._sourceCached.value;
  }
}
