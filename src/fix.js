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
import { fixPackage } from "./validate-package";

async function fixEntrypoint(entrypoint: Entrypoint) {
  validateEntrypointSource(entrypoint);
  if (!isMainFieldValid(entrypoint)) {
    entrypoint.main = getValidMainField(entrypoint);
  }
  if (entrypoint.module !== null && !isModuleFieldValid(entrypoint)) {
    let validModuleField = getValidModuleField(entrypoint);
    entrypoint.module = validModuleField;
  }
  if (entrypoint.umdMain !== null) {
    if (!isUmdMainFieldValid(entrypoint) || !isUmdNameSpecified(entrypoint)) {
      entrypoint.umdMain = getValidUmdMainField(entrypoint);
      let umdName = await promptInput(inputs.getUmdName, entrypoint);
      entrypoint.umdName = umdName;
    }
  }
  if (entrypoint.browser !== null && !isBrowserFieldValid(entrypoint)) {
    entrypoint.browser = getValidBrowserField(entrypoint);
  }

  if (entrypoint.reactNative !== null && !isReactNativeFieldValid(entrypoint)) {
    entrypoint.reactNative = getValidReactNativeField(entrypoint);
  }
  await entrypoint.save();
}

export default async function fix(directory: string) {
  let { packages } = await Project.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  await Promise.all(
    packages.map(async pkg => {
      await fixPackage(pkg);
      return Promise.all(
        pkg.entrypoints.map(entrypoint => fixEntrypoint(entrypoint))
      ).then(a => a.some(x => x));
    })
  );

  let obj = packages.length > 1 ? "packages" : "package";
  success(`fixed ${obj}!`);
}
