import { Project } from "./project";
import { Entrypoint } from "./entrypoint";
import { errors, successes, infos } from "./messages";
import { FatalError, FixableError } from "./errors";
import { validFields } from "./utils";
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
        `entrypoint source files must be inside their respective package directory but this entrypoint has specified its source file as ${entrypoint.configSource}`,
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

export const isFieldValid = {
  main(entrypoint: Entrypoint) {
    return entrypoint.json.main === validFields.main(entrypoint);
  },
  module(entrypoint: Entrypoint) {
    return entrypoint.json.module === validFields.module(entrypoint);
  },
  "umd:main"(entrypoint: Entrypoint) {
    return entrypoint.json["umd:main"] === validFields["umd:main"](entrypoint);
  },
  browser(entrypoint: Entrypoint): boolean {
    return equal(entrypoint.json.browser, validFields.browser(entrypoint));
  },
};

export function isUmdNameSpecified(entrypoint: Entrypoint) {
  return typeof entrypoint.json.preconstruct.umdName === "string";
}

export function validateEntrypoint(entrypoint: Entrypoint, log: boolean) {
  validateEntrypointSource(entrypoint);
  if (log) {
    logger.info(infos.validEntrypoint, entrypoint.name);
  }
  for (const field of ["main", "module", "umd:main", "browser"] as const) {
    if (field !== "main" && entrypoint.json[field] === undefined) {
      continue;
    }
    if (!isFieldValid[field](entrypoint)) {
      throw new FixableError(
        errors.invalidField(
          field,
          entrypoint.json[field],
          validFields[field](entrypoint)
        ),
        entrypoint.name
      );
    }
    if (field === "umd:main" && !isUmdNameSpecified(entrypoint)) {
      throw new FixableError(errors.umdNameNotSpecified, entrypoint.name);
    }
    if (log) {
      logger.info(infos.validField(field), entrypoint.name);
    }
  }
}

export function validateProject(project: Project) {
  for (let pkg of project.packages) {
    validatePackage(pkg);
    for (let entrypoint of pkg.entrypoints) {
      validateEntrypoint(entrypoint, false);
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
