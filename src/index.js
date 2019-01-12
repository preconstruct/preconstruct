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
    // why is this different to the other two?
    // in the other two, we're able to be more strict
    // about the paths that get matched
    // but in rollup-plugin-alias we're not able to
    // so we return the absolute path here
    // why don't we always return the absolute path?
    // because we want to be more strict about imports
    // so a package can only be imported if it can be resolved
    // through normal node_modules stuff
    let pkgs = getPackages(cwd);
    let rollupAliases = {};
    pkgs.forEach(pkg => {
      rollupAliases[pkg.name] = pkg.source;
    });
    return rollupAliases;
  },
  webpack(cwd: string = process.cwd()) {
    let pkgs = getPackages(cwd);
    return getAliases(pkgs, name => `${name}$`);
  }
};
