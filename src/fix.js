// @flow
import { Package } from "./package";
import { promptInput } from "./prompt";
import { success } from "./logger";
import { inputs } from "./messages";
import {
  getValidModuleField,
  getValidMainField,
  getValidUmdMainField,
  getValidBrowserField,
  getValidReactNativeField
} from "./utils";
import {
  validateEntrypoint,
  isMainFieldValid,
  isModuleFieldValid,
  isUmdMainFieldValid,
  isUmdNameSpecified,
  isBrowserFieldValid,
  isReactNativeFieldValid
} from "./validate";

async function fixPackage(pkg: Package) {
  validateEntrypoint(pkg);
  let didModify = false;
  if (!isMainFieldValid(pkg)) {
    didModify = true;
    pkg.main = getValidMainField(pkg);
  }
  if (pkg.module !== null && !isModuleFieldValid(pkg)) {
    didModify = true;

    let validModuleField = getValidModuleField(pkg);
    pkg.module = validModuleField;
  }
  if (pkg.umdMain !== null) {
    if (!isUmdMainFieldValid(pkg) || !isUmdNameSpecified(pkg)) {
      didModify = true;

      pkg.umdMain = getValidUmdMainField(pkg);
      let umdName = await promptInput(inputs.getUmdName, pkg);
      pkg.umdName = umdName;
    }
  }

  if (pkg.browser !== null && !isBrowserFieldValid(pkg)) {
    didModify = true;

    pkg.browser = getValidBrowserField(pkg);
  }

  if (pkg.reactNative !== null && !isReactNativeFieldValid(pkg)) {
    didModify = true;

    pkg.reactNative = getValidReactNativeField(pkg);
  }

  await pkg.save();
  return didModify;
}

export default async function fix(directory: string) {
  let pkg = await Package.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  let packages = await pkg.packages();
  if (packages === null) {
    let didModify = await fixPackage(pkg);
    success(didModify ? "fixed package!" : "package already valid!");
  } else {
    let didModify = (await Promise.all(
      packages.map(pkg => fixPackage(pkg))
    )).some(x => x);

    success(didModify ? "fixed packages!" : "packages already valid!");
  }
}
