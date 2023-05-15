import nodePath from "path";
import { Item } from "./item";
import { Package, ExportsConditions } from "./package";
import { JSONValue } from "./utils";
import normalizePath from "normalize-path";

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
  afterPackageName: string;
  constructor(
    filePath: string,
    contents: string,
    pkg: Package,
    source: string
  ) {
    super(filePath, contents, pkg._jsonDataByPath);
    this.package = pkg;
    this.source = source;
    this.afterPackageName =
      pkg.directory === this.directory
        ? ""
        : "/" +
          normalizePath(
            nodePath.dirname(nodePath.relative(pkg.directory, filePath))
          );
  }

  get hasModuleField() {
    return this.json.module !== undefined;
  }

  get name(): string {
    return this.package.name + this.afterPackageName;
  }
}
