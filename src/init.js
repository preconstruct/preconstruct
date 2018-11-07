// @flow
import Package from "./package";
import path from "path";
import * as fs from "fs-extra";
import { promptConfirm } from "./prompt";
import { FatalError, ValidationError } from "./errors";
import { success, error, info } from "./logger";
import { infos, confirms, errors } from "./messages";
import { getValidModuleField, getValidMainField } from "./utils";
import {
  validateEntrypoint,
  validateMainField,
  validateModuleField
} from "./validate";

async function doInit(pkg: Package) {
  validateEntrypoint(pkg);
  try {
    validateMainField(pkg);
    info(infos.validMainField);
  } catch (error) {
    if (error instanceof ValidationError) {
      let canWriteMainField = await promptConfirm(confirms.writeMainField);
      if (!canWriteMainField) {
        throw new FatalError(errors.deniedWriteMainField);
      }
      pkg.main = getValidMainField(pkg);
    } else {
      throw error;
    }
  }
  try {
    validateModuleField(pkg);
    info(infos.validModuleField);
  } catch (err) {
    if (err instanceof ValidationError) {
      let canWriteModuleField = await promptConfirm(confirms.writeModuleField);
      let validModuleField = getValidModuleField(pkg);
      if (canWriteModuleField) {
        pkg.module = validModuleField;
      } else if (pkg.module) {
        error(errors.invalidModuleField);
        let shouldFixModuleField = await promptConfirm(confirms.fixModuleField);
        if (!shouldFixModuleField) {
          throw new FatalError(errors.invalidModuleField);
        }
        pkg.module = validModuleField;
      }
    } else {
      throw error;
    }
  }

  // ask if user wants umd build
  // check if there is a browser option and if it's invalid, offer to fix it
  await pkg.save();
}

export default async function init(directory: string) {
  let pkg = await Package.create(path.join(directory));
  // do more stuff with checking whether the repo is yarn workspaces or bolt monorepo

  let workspaces = await pkg.packages();
  if (workspaces === null) {
    await doInit(pkg);
  } else {
    // todo: figure out a way to make the validation parallel(how should the prompts work? batch all prompts of the same type? dataloader-style)
    for (let workspace of workspaces) {
      await doInit(workspace);
    }
  }
  success("Initialised package!");
}
