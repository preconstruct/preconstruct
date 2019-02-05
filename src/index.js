// @flow

// why is this better than assuming src/index.js?
// because if we allow other entrypoints in the future,
// we can support that here and the same config that's
// used for bundling will be used for aliasing
import { Package } from "./package";

function getPackages(cwd) {
  let pkg = Package.createSync(cwd);
  let pkgs = pkg.packagesSync();
  if (pkgs === null) {
    pkgs = [pkg];
  }
  pkgs = pkgs.map(x => x.strict());
  return pkgs;
}

function getAbsoluteAliases(cwd, converter = x => x) {
  let pkgs = getPackages(cwd);
  let aliases = {};
  pkgs.forEach(pkg => {
    aliases[converter(pkg.name)] = pkg.source;
  });
  return aliases;
}

// inspired by https://github.com/Andarist/lerna-alias
export let aliases = {
  jest(cwd: string = process.cwd()) {
    return getAbsoluteAliases(cwd, name => `^${name}$`);
  },
  rollup(cwd: string = process.cwd()) {
    return getAbsoluteAliases(cwd);
  },
  webpack(cwd: string = process.cwd()) {
    return getAbsoluteAliases(cwd, name => `${name}$`);
  }
};
