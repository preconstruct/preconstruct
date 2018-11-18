// @flow

// why is this better than assuming src/index.js?
// because if we allow other entrypoints in the future,
// we can support that here and the same config that's
// used for bundling will be used for aliasing
import { Package } from "./package";
import { getAliases } from "./build/aliases";

function getPackages(cwd) {
  let pkg = Package.createSync(cwd);
  let pkgs = pkg.packagesSync();
  if (pkgs === null) {
    pkgs = [pkg];
  }
  pkgs = pkgs.map(x => x.strict());
  return pkgs;
}

// inspired by https://github.com/Andarist/lerna-alias
export let aliases = {
  jest(cwd: string = process.cwd()) {
    let pkgs = getPackages(cwd);
    return getAliases(pkgs, name => `^${name}$`);
  },
  rollup(cwd: string = process.cwd()) {
    let pkgs = getPackages(cwd);
    return getAliases(pkgs);
  },
  webpack(cwd: string = process.cwd()) {
    let pkgs = getPackages(cwd);
    return getAliases(pkgs, name => `${name}$`);
  }
};
