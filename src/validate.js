// @flow
import { Project } from "./project";
import { Entrypoint } from "./entrypoint";
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
    require.resolve(entrypoint.source);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new FatalError(
        errors.noSource(entrypoint.configSource),
        entrypoint
      );
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
  validateEntrypointSource(entrypoint);
  if (log) {
    logger.info(infos.validEntrypoint, entrypoint);
  }
  if (!isMainFieldValid(entrypoint)) {
    throw new FatalError(errors.invalidMainField, entrypoint);
  }
  if (log) {
    logger.info(infos.validMainField, entrypoint);
  }
  if (entrypoint.module !== null) {
    if (isModuleFieldValid(entrypoint)) {
      if (log) {
        logger.info(infos.validModuleField, entrypoint);
      }
    } else {
      throw new FatalError(errors.invalidMainField, entrypoint);
    }
  }
  if (entrypoint.umdMain !== null) {
    if (isUmdMainFieldValid(entrypoint)) {
      if (isUmdNameSpecified(entrypoint)) {
        if (log) {
          logger.info(infos.validUmdMainField, entrypoint);
        }
      } else {
        throw new FatalError(errors.umdNameNotSpecified, entrypoint);
      }
    } else {
      throw new FatalError(errors.invalidUmdMainField, entrypoint);
    }
  }
  if (entrypoint.browser !== null) {
    if (
      typeof entrypoint.browser === "string" ||
      !isBrowserFieldValid(entrypoint)
    ) {
      throw new FatalError(errors.invalidBrowserField, entrypoint);
    } else if (log) {
      logger.info(infos.validBrowserField, entrypoint);
    }
  }
  if (entrypoint.reactNative !== null) {
    if (
      typeof entrypoint.reactNative === "string" ||
      !isReactNativeFieldValid(entrypoint)
    ) {
      throw new FatalError(errors.invalidReactNativeField, entrypoint);
    } else if (log) {
      logger.info(infos.validReactNativeField, entrypoint);
    }
  }
}

export default async function validate(directory: string) {
  let project = await Project.create(directory);

  for (let pkg of project.packages) {
    for (let entrypoint of pkg.entrypoints) {
      validateEntrypoint(entrypoint, true);
    }
  }

  logger.success(successes.validPackage);
}
