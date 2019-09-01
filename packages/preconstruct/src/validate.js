// @flow
import { Project } from "./project";
import { Entrypoint } from "./entrypoint";
import { errors, successes, infos } from "./messages";
import { FatalError, FixableError } from "./errors";
import {
  getValidObjectFieldContentForBuildType,
  getValidStringFieldContentForBuildType
} from "./utils";
import * as logger from "./logger";
import equal from "fast-deep-equal";
import { validatePackage } from "./validate-package";

// this doesn't offer to fix anything
// just does validation
// used in build and watch

export function validateEntrypointSource(entrypoint: Entrypoint) {
  try {
    if (!entrypoint.source.startsWith(entrypoint.package.directory)) {
      throw new FatalError(
        `entrypoint source files must be inside their respective package directory but this entrypoint has specified its source file as ${
          entrypoint.configSource
        }`,
        entrypoint.name
      );
    }
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new FatalError(
        errors.noSource(entrypoint.configSource),
        entrypoint.name
      );
    }
    throw e;
  }
}

export function isMainFieldValid(entrypoint: Entrypoint) {
  return (
    entrypoint.main ===
    getValidStringFieldContentForBuildType("main", entrypoint.package.name)
  );
}

export function isModuleFieldValid(entrypoint: Entrypoint) {
  return (
    entrypoint.module ===
    getValidStringFieldContentForBuildType("module", entrypoint.package.name)
  );
}

export function isUmdMainFieldValid(entrypoint: Entrypoint) {
  return (
    entrypoint.umdMain ===
    getValidStringFieldContentForBuildType("umd:main", entrypoint.package.name)
  );
}

export function isBrowserFieldValid(entrypoint: Entrypoint): boolean {
  return equal(
    entrypoint.browser,
    getValidObjectFieldContentForBuildType(
      "browser",
      entrypoint.package.name,
      entrypoint.module !== null
    )
  );
}

export function isUmdNameSpecified(entrypoint: Entrypoint) {
  return typeof entrypoint._config.umdName === "string";
}

export function validateEntrypoint(entrypoint: Entrypoint, log: boolean) {
  validateEntrypointSource(entrypoint);
  if (log) {
    logger.info(infos.validEntrypoint, entrypoint.name);
  }
  if (!isMainFieldValid(entrypoint)) {
    throw new FixableError(errors.invalidMainField, entrypoint.name);
  }
  if (log) {
    logger.info(infos.validMainField, entrypoint.name);
  }
  if (entrypoint.module !== null) {
    if (isModuleFieldValid(entrypoint)) {
      if (log) {
        logger.info(infos.validModuleField, entrypoint.name);
      }
    } else {
      throw new FixableError(errors.invalidModuleField, entrypoint.name);
    }
  }
  if (entrypoint.umdMain !== null) {
    if (isUmdMainFieldValid(entrypoint)) {
      if (isUmdNameSpecified(entrypoint)) {
        if (log) {
          logger.info(infos.validUmdMainField, entrypoint.name);
        }
      } else {
        throw new FixableError(errors.umdNameNotSpecified, entrypoint.name);
      }
    } else {
      throw new FixableError(errors.invalidUmdMainField, entrypoint.name);
    }
  }
  if (entrypoint.browser !== null) {
    if (
      typeof entrypoint.browser === "string" ||
      !isBrowserFieldValid(entrypoint)
    ) {
      throw new FixableError(errors.invalidBrowserField, entrypoint.name);
    } else if (log) {
      logger.info(infos.validBrowserField, entrypoint.name);
    }
  }
}

export default async function validate(directory: string) {
  let project: Project = await Project.create(directory);

  for (let pkg of project.packages) {
    validatePackage(pkg);
    for (let entrypoint of pkg.entrypoints) {
      validateEntrypoint(entrypoint, true);
    }
    logger.info(infos.validPackageEntrypoints, pkg.name);
  }

  logger.success(successes.validProject);
}
