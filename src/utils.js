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
  return `dist/${nameForDist}.umd.min.js`;
}
