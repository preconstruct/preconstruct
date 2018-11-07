// @flow
import Package from "./package";
import path from "path";
import { errors, successes, infos } from "./messages";
import { FatalError, ValidationError } from "./errors";
import { getValidModuleField, getValidMainField } from "./utils";
import * as logger from "./logger";

// this doesn't offer to fix anything
// just does validation
// used in build and watch

export function validateEntrypoint(pkg: Package) {
  try {
    require.resolve(path.join(pkg.directory, "src"));
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new FatalError(errors.noEntryPoint);
    }
    throw e;
  }
}

export function validateMainField(pkg: Package) {
  if (pkg.main !== getValidMainField(pkg)) {
    throw new ValidationError(errors.invalidMainField);
  }
}

export function validateModuleField(pkg: Package) {
  if (pkg.module !== getValidModuleField(pkg)) {
    throw new ValidationError(errors.invalidModuleField);
  }
}

async function validatePackage(pkg: Package) {
  validateEntrypoint(pkg);
  logger.info(infos.validEntrypoint);
  try {
    validateMainField(pkg);
  } catch (e) {
    if (e instanceof ValidationError) {
      throw new FatalError(e.message);
    }
    throw e;
  }
  logger.info(infos.validMainField);
  try {
    validateModuleField(pkg);
  } catch (e) {
    if (e instanceof ValidationError) {
      throw new FatalError(e.message);
    }
    throw e;
  }
  logger.info(infos.validModuleField);
}

export default async function validate(directory: string) {
  let pkg = await Package.create(directory);

  let workspaces = await pkg.packages();
  if (workspaces === null) {
    validatePackage(pkg);
  } else {
    for (let workspace of workspaces) {
      validatePackage(workspace);
    }
  }

  logger.success(successes.validPackage);
}
