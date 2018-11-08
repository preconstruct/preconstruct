// @flow

import { StrictPackage } from "../package";
import path from "path";

export type Aliases = {
  [key: string]: string
};

export function getAliases(packages: Array<StrictPackage>): Aliases {
  let aliases = {};
  packages.forEach(pkg => {
    aliases[pkg.name] = path.join(pkg.directory, "src", "index.js");
  });
  return aliases;
}
