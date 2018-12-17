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

export function getValidCjsBrowserPath(pkg: Package) {
  return getValidMainField(pkg).replace("cjs", "browser.cjs");
}

export function getValidModuleBrowserPath(pkg: Package) {
  return getValidModuleField(pkg).replace("esm", "browser.esm");
}

export function getValidCjsReactNativePath(pkg: Package) {
  return getValidMainField(pkg).replace("cjs", "native.cjs");
}

export function getValidModuleReactNativePath(pkg: Package) {
  return getValidModuleField(pkg).replace("esm", "native.esm");
}

export function getValidBrowserField(pkg: Package) {
  let obj = {
    [`./${getValidMainField(pkg)}`]: "./" + getValidCjsBrowserPath(pkg)
  };
  if (pkg.module !== null) {
    obj[`./${getValidModuleField(pkg)}`] =
      "./" + getValidModuleBrowserPath(pkg);
  }
  return obj;
}

export function getValidReactNativeField(pkg: Package) {
  let obj = {
    [`./${getValidMainField(pkg)}`]: "./" + getValidCjsReactNativePath(pkg)
  };
  if (pkg.module !== null) {
    obj[`./${getValidModuleField(pkg)}`] =
      "./" + getValidModuleReactNativePath(pkg);
  }
  return obj;
}

export function getValidUmdMainField(pkg: Package) {
  let nameForDist = getNameForDist(pkg.name);
  return `dist/${nameForDist}.umd.min.js`;
}
