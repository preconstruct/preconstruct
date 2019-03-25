// @flow
import { Entrypoint } from "./entrypoint";
import { Project } from "./project";
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
  validateEntrypointSource,
  isMainFieldValid,
  isModuleFieldValid,
  isUmdMainFieldValid,
  isUmdNameSpecified,
  isBrowserFieldValid,
  isReactNativeFieldValid
} from "./validate";

async function fixEntrypoint(entrypoint: Entrypoint) {
  validateEntrypointSource(entrypoint);
  let didModify = false;
  if (!isMainFieldValid(entrypoint)) {
    didModify = true;
    entrypoint.main = getValidMainField(entrypoint);
  }
  if (entrypoint.module !== null && !isModuleFieldValid(entrypoint)) {
    didModify = true;

    let validModuleField = getValidModuleField(entrypoint);
    entrypoint.module = validModuleField;
  }
  if (entrypoint.umdMain !== null) {
    if (!isUmdMainFieldValid(entrypoint) || !isUmdNameSpecified(entrypoint)) {
      didModify = true;

      entrypoint.umdMain = getValidUmdMainField(entrypoint);
      let umdName = await promptInput(inputs.getUmdName, entrypoint);
      entrypoint.umdName = umdName;
    }
  }

  if (entrypoint.browser !== null && !isBrowserFieldValid(entrypoint)) {
    didModify = true;

    entrypoint.browser = getValidBrowserField(entrypoint);
  }

  if (entrypoint.reactNative !== null && !isReactNativeFieldValid(entrypoint)) {
    didModify = true;

    entrypoint.reactNative = getValidReactNativeField(entrypoint);
  }
  if (didModify) {
    await entrypoint.save();
  }
  return didModify;
}

export default async function fix(directory: string) {
  let { packages } = await Project.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  let didModify = (await Promise.all(
    packages.map(pkg =>
      Promise.all(
        pkg.entrypoints.map(entrypoint => fixEntrypoint(entrypoint))
      ).then(a => a.some(x => x))
    )
  )).some(x => x);

  let obj = packages.length > 1 ? "packages" : "package";
  success(didModify ? `fixed ${obj}!` : `${obj} already valid!`);
}
