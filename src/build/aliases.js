// @flow

import { StrictPackage } from "../package";
import path from "path";

export type Aliases = {
  [key: string]: string
};

export function getAliases(
  packages: Array<StrictPackage>,
  getKey: string => string = x => x
): Aliases {
  let aliases = {};
  packages.forEach(pkg => {
    aliases[getKey(pkg.name)] = path.join(pkg.name, "src", "index.js");
  });
  return aliases;
}
