// @flow
import { Package } from "./package";
import { promptInput } from "./prompt";
import { FatalError } from "./errors";
import { success, error, info } from "./logger";
import { infos, confirms, errors, inputs } from "./messages";
import {
  getValidModuleField,
  getValidMainField,
  getValidUmdMainField
} from "./utils";
import {
  validateEntrypoint,
  isMainFieldValid,
  isModuleFieldValid,
  isUmdMainFieldValid,
  isUmdNameSpecified
} from "./validate";

async function doInit(pkg: Package) {
  validateEntrypoint(pkg);
  if (isMainFieldValid(pkg)) {
    info(infos.validMainField, pkg);
  } else {
    let canWriteMainField = await confirms.writeMainField(pkg);
    if (!canWriteMainField) {
      throw new FatalError(errors.deniedWriteMainField);
    }
    pkg.main = getValidMainField(pkg);
  }

  if (pkg.module === null || !isModuleFieldValid(pkg)) {
    let canWriteModuleField = await confirms.writeModuleField(pkg);
    let validModuleField = getValidModuleField(pkg);
    if (canWriteModuleField) {
      pkg.module = validModuleField;
    } else if (pkg.module) {
      error(errors.invalidModuleField, pkg);
      let shouldFixModuleField = await confirms.fixModuleField(pkg);
      if (!shouldFixModuleField) {
        throw new FatalError(errors.invalidModuleField);
      }
      pkg.module = validModuleField;
    }
  } else {
    info(infos.validModuleField, pkg);
  }

  if (
    pkg.umdMain === null ||
    !isUmdMainFieldValid(pkg) ||
    !isUmdNameSpecified(pkg)
  ) {
    let shouldWriteUMDBuilds = await confirms.writeUmdBuilds(pkg);
    if (shouldWriteUMDBuilds) {
      pkg.umdMain = getValidUmdMainField(pkg);
      let umdName = await promptInput(inputs.getUmdName, pkg);
      pkg.umdName = umdName;
    } else if (
      pkg.umdMain !== null &&
      (!isUmdMainFieldValid(pkg) || !isUmdNameSpecified(pkg))
    ) {
      throw new FatalError(errors.invalidUmdMainField);
    }
  }

  // check if there is a browser option and if it's invalid, offer to fix it
  await pkg.save();
}

export default async function init(directory: string) {
  let pkg = await Package.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  let packages = await pkg.packages();
  if (packages === null) {
    await doInit(pkg);
    success("Initialised package!");
  } else {
    await Promise.all(packages.map(pkg => doInit(pkg)));

    success("Initialised packages!");
  }
}
