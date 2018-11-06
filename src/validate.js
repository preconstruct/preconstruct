// @flow
import Package from "./package";
import path from "path";
import { errors } from "./messages";
import { FatalError, ValidationError } from "./errors";
import { getValidModuleField, getValidMainField } from "./utils";

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
  if (pkg.module !== getValidMainField(pkg)) {
    throw new ValidationError(errors.invalidMainField);
  }
}

async function validatePackage(pkg: Package) {
  validateEntrypoint(pkg);
  validateMainField(pkg);
  validateModuleField(pkg);
}

export default async function validate(directory: string) {
  let pkg = await Package.create(path.join(directory));

  let workspaces = await pkg.packages();
  if (workspaces === null) {
    validatePackage(pkg);
  } else {
    for (let workspace of workspaces) {
      validatePackage(workspace);
    }
  }
}
