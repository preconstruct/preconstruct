// @flow
import { Package } from "./package";
import path from "path";
import { errors, successes, infos } from "./messages";
import { FatalError } from "./errors";
import {
  getValidModuleField,
  getValidMainField,
  getValidUmdMainField,
  getValidBrowserField
} from "./utils";
import * as logger from "./logger";
import equal from "fast-deep-equal";

// this doesn't offer to fix anything
// just does validation
// used in build and watch

export function validateEntrypoint(pkg: Package) {
  try {
    require.resolve(path.join(pkg.directory, "src"));
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new FatalError(errors.noEntryPoint, pkg);
    }
    throw e;
  }
}

export function isMainFieldValid(pkg: Package) {
  return pkg.main === getValidMainField(pkg);
}

export function isModuleFieldValid(pkg: Package) {
  return pkg.module === getValidModuleField(pkg);
}

export function isUmdMainFieldValid(pkg: Package) {
  return pkg.umdMain === getValidUmdMainField(pkg);
}

export function isBrowserFieldValid(pkg: Package): boolean {
  return equal(pkg.browser, getValidBrowserField(pkg));
}

export function isUmdNameSpecified(pkg: Package) {
  return pkg.config.umdName !== null;
}

export function validatePackage(pkg: Package) {
  validateEntrypoint(pkg);
  logger.info(infos.validEntrypoint, pkg);
  if (!isMainFieldValid(pkg)) {
    throw new FatalError(errors.invalidMainField, pkg);
  }

  logger.info(infos.validMainField, pkg);
  if (pkg.module !== null) {
    if (isModuleFieldValid(pkg)) {
      logger.info(infos.validModuleField, pkg);
    } else {
      throw new FatalError(errors.invalidMainField, pkg);
    }
  }
  if (pkg.umdMain !== null) {
    if (isUmdMainFieldValid(pkg)) {
      if (isUmdNameSpecified(pkg)) {
        logger.info(infos.validUmdMainField, pkg);
      } else {
        throw new FatalError(errors.umdNameNotSpecified, pkg);
      }
    } else {
      throw new FatalError(errors.invalidUmdMainField, pkg);
    }
  }
  if (pkg.browser !== null) {
    if (typeof pkg.browser === "string" || !isBrowserFieldValid(pkg)) {
      throw new FatalError(errors.invalidBrowserField, pkg);
    } else {
      logger.info(infos.validBrowserField, pkg);
    }
  }
}

export default async function validate(directory: string) {
  let pkg = await Package.create(directory);

  let packages = await pkg.packages();
  if (packages === null) {
    validatePackage(pkg);
  } else {
    for (let pkg of packages) {
      validatePackage(pkg);
    }
  }

  logger.success(successes.validPackage);
}
