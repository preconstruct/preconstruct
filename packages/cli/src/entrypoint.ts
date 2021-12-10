import nodePath from "path";
import { Item } from "./item";
import { Package } from "./package";
import { JSONValue } from "./utils";
import normalizePath from "normalize-path";

export type ExportsConditions = {
  module?: string;
  default?: string;
};

export type ExportsItem = {
  browser?: ExportsConditions | string;
  worker?: ExportsConditions | string;
} & ExportsConditions;

export class Entrypoint extends Item<{
  main?: JSONValue;
  module?: JSONValue;
  "umd:main"?: JSONValue;
  browser?: JSONValue;
  exports?: Record<string, ExportsItem | string>;
  preconstruct: {
    source?: JSONValue;
    umdName?: JSONValue;
  };
}> {
  package: Package;
  source: string;
  constructor(
    filePath: string,
    contents: string,
    pkg: Package,
    source: string
  ) {
    super(filePath, contents, pkg._jsonDataByPath);
    this.package = pkg;
    this.source = source;
  }

  get name(): string {
    return normalizePath(
      nodePath.join(
        this.package.name,
        nodePath.relative(this.package.directory, this.directory)
      )
    );
  }
}
