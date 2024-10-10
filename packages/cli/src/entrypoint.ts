import path from "node:path";
import { Item } from "./item";
import { Package, ExportsConditions } from "./package";
import { JSONValue, normalizePath } from "./utils";

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
          normalizePath(path.dirname(path.relative(pkg.directory, filePath)));
  }

  get hasModuleField() {
    return this.json.module !== undefined;
  }

  get name(): string {
    return this.package.name + this.afterPackageName;
  }
}
