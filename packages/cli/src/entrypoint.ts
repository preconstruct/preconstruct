import nodePath from "path";
import { Item } from "./item";
import { Package } from "./package";
import { JSONValue } from "./utils";
import normalizePath from "normalize-path";

export type ExportsConditions = {
  worker?: {
    production: {
      module?: string;
      default: string;
    };
    development: {
      module?: string;
      default: string;
    };
    module?: string;
    default: string;
  };
  browser?: {
    production: {
      module?: string;
      default: string;
    };
    development: {
      module?: string;
      default: string;
    };
    module?: string;
    default: string;
  };
  production?: {
    module?: string;
    default: string;
  };
  development?: {
    module?: string;
    default: string;
  };
  module?: string;
  default: string;
};

export class Entrypoint extends Item<{
  main?: JSONValue;
  module?: JSONValue;
  "umd:main"?: JSONValue;
  browser?: JSONValue;
  exports?: Record<string, ExportsConditions | string>;
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
