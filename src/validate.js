// @flow
import { Package } from "./package";
import { Entrypoint } from "./entrypoint";
import path from "path";
import { errors, successes, infos } from "./messages";
import { FatalError } from "./errors";
import {
  getValidModuleField,
  getValidMainField,
  getValidUmdMainField,
  getValidBrowserField,
  getValidReactNativeField
} from "./utils";
import * as logger from "./logger";
import equal from "fast-deep-equal";

// this doesn't offer to fix anything
// just does validation
// used in build and watch

export function validateEntrypointSource(entrypoint: Entrypoint) {
  try {
    require.resolve(path.join(entrypoint.directory, "src"));
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new FatalError(errors.noEntryPoint, entrypoint);
    }
    throw e;
  }
}

export function isMainFieldValid(entrypoint: Entrypoint) {
  return entrypoint.main === getValidMainField(entrypoint);
}

export function isModuleFieldValid(entrypoint: Entrypoint) {
  return entrypoint.module === getValidModuleField(entrypoint);
}

export function isUmdMainFieldValid(entrypoint: Entrypoint) {
  return entrypoint.umdMain === getValidUmdMainField(entrypoint);
}

export function isBrowserFieldValid(entrypoint: Entrypoint): boolean {
  return equal(entrypoint.browser, getValidBrowserField(entrypoint));
}

export function isReactNativeFieldValid(entrypoint: Entrypoint): boolean {
  return equal(entrypoint.reactNative, getValidReactNativeField(entrypoint));
}

export function isUmdNameSpecified(entrypoint: Entrypoint) {
  return entrypoint._config.umdName !== null;
}

export function validateEntrypoint(entrypoint: Entrypoint, log: boolean) {
  validateEntrypoint(entrypoint);
  if (log) {
    logger.info(infos.validEntrypoint, pkg);
  }
  if (!isMainFieldValid(pkg)) {
    throw new FatalError(errors.invalidMainField, pkg);
  }
  if (log) {
    logger.info(infos.validMainField, pkg);
  }
  if (pkg.module !== null) {
    if (isModuleFieldValid(pkg)) {
      if (log) {
        logger.info(infos.validModuleField, pkg);
      }
    } else {
      throw new FatalError(errors.invalidMainField, pkg);
    }
  }
  if (pkg.umdMain !== null) {
    if (isUmdMainFieldValid(pkg)) {
      if (isUmdNameSpecified(pkg)) {
        if (log) {
          logger.info(infos.validUmdMainField, pkg);
        }
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
    } else if (log) {
      logger.info(infos.validBrowserField, pkg);
    }
  }
  if (pkg.reactNative !== null) {
    if (typeof pkg.reactNative === "string" || !isReactNativeFieldValid(pkg)) {
      throw new FatalError(errors.invalidReactNativeField, pkg);
    } else if (log) {
      logger.info(infos.validReactNativeField, pkg);
    }
  }
}

export default async function validate(directory: string) {
  let pkg = await Package.create(directory);

  let packages = await pkg.packages();
  if (packages === null) {
    validatePackage(pkg, true);
  } else {
    for (let pkg of packages) {
      validatePackage(pkg, true);
    }
  }

  logger.success(successes.validPackage);
}
