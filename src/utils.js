// @flow
import { Package } from "./package";

export function getNameForDist(name: string): string {
  return name.replace(/.*\//, "");
}

export function getValidMainField(pkg: Package) {
  let nameForDist = getNameForDist(pkg.name);
  return `dist/${nameForDist}.cjs.js`;
}

export function getValidModuleField(pkg: Package) {
  let nameForDist = getNameForDist(pkg.name);
  return `dist/${nameForDist}.esm.js`;
}

export function getValidUmdMainField(pkg: Package) {
  let nameForDist = getNameForDist(pkg.name);
  return `dist/${nameForDist}.min.js`;
}

function getDevPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".dev.js");
}

function getProdPath(cjsPath: string) {
  return cjsPath.replace(/\.js$/, ".prod.js");
}
