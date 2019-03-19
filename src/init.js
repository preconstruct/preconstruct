// @flow
import { Entrypoint } from "./entrypoint";
import { Project } from "./project";
import { promptInput } from "./prompt";
import { FatalError } from "./errors";
import { success, error, info } from "./logger";
import { infos, confirms, errors, inputs } from "./messages";
import {
  getValidModuleField,
  getValidMainField,
  getValidUmdMainField,
  getValidBrowserField
} from "./utils";
import {
  validateEntrypointSource,
  isMainFieldValid,
  isModuleFieldValid,
  isUmdMainFieldValid,
  isUmdNameSpecified,
  isBrowserFieldValid
} from "./validate";

async function doInit(entrypoint: Entrypoint) {
  validateEntrypointSource(entrypoint);
  if (isMainFieldValid(entrypoint)) {
    info(infos.validMainField, entrypoint);
  } else {
    let canWriteMainField = await confirms.writeMainField(entrypoint);
    if (!canWriteMainField) {
      throw new FatalError(errors.deniedWriteMainField, entrypoint);
    }
    entrypoint.main = getValidMainField(entrypoint);
  }

  if (entrypoint.module === null || !isModuleFieldValid(entrypoint)) {
    let canWriteModuleField = await confirms.writeModuleField(entrypoint);
    let validModuleField = getValidModuleField(entrypoint);
    if (canWriteModuleField) {
      entrypoint.module = validModuleField;
    } else if (entrypoint.module) {
      error(errors.invalidModuleField, entrypoint);
      let shouldFixModuleField = await confirms.fixModuleField(entrypoint);
      if (!shouldFixModuleField) {
        throw new FatalError(errors.invalidModuleField, entrypoint);
      }
      entrypoint.module = validModuleField;
    }
  } else {
    info(infos.validModuleField, entrypoint);
  }

  if (
    entrypoint.umdMain === null ||
    !isUmdMainFieldValid(entrypoint) ||
    !isUmdNameSpecified(entrypoint)
  ) {
    let shouldWriteUMDBuilds = await confirms.writeUmdBuilds(entrypoint);
    if (shouldWriteUMDBuilds) {
      entrypoint.umdMain = getValidUmdMainField(entrypoint);
      let umdName = await promptInput(inputs.getUmdName, entrypoint);
      entrypoint.umdName = umdName;
    } else if (
      entrypoint.umdMain !== null &&
      (!isUmdMainFieldValid(entrypoint) || !isUmdNameSpecified(entrypoint))
    ) {
      throw new FatalError(errors.invalidUmdMainField, entrypoint);
    }
  }

  if (entrypoint.browser !== null && !isBrowserFieldValid(entrypoint)) {
    let shouldFixBrowserField = await confirms.addBrowserField(entrypoint);
    if (shouldFixBrowserField) {
      entrypoint.browser = getValidBrowserField(entrypoint);
    } else {
      throw new FatalError(errors.invalidBrowserField, entrypoint);
    }
  }

  await entrypoint.save();
}

export default async function init(directory: string) {
  let project = await Project.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  await Promise.all(
    project.packages.map(pkg =>
      Promise.all(pkg.entrypoints.map(entrypoint => doInit(entrypoint)))
    )
  );
  success(
    project.packages.length > 1
      ? "Initialised packages!"
      : "Initialised package!"
  );
}
