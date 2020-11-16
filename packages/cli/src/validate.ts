import { Project } from "./project";
import { Entrypoint } from "./entrypoint";
import { errors, successes, infos } from "./messages";
import { BatchError, FatalError, FixableError } from "./errors";
import { validFields } from "./utils";
import * as logger from "./logger";
import equal from "fast-deep-equal";
import { validatePackage } from "./validate-package";
import chalk from "chalk";

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

let projectsShownOldDistNamesInfo = new WeakSet<Project>();

function validateEntrypoint(entrypoint: Entrypoint, log: boolean) {
  validateEntrypointSource(entrypoint);
  if (log) {
    logger.info(infos.validEntrypoint, entrypoint.name);
  }
  const fatalErrors: FatalError[] = [];
  for (const field of ["main", "module", "umd:main", "browser"] as const) {
    if (field !== "main" && entrypoint.json[field] === undefined) {
      continue;
    }
    if (!isFieldValid[field](entrypoint)) {
      let isUsingOldDistFilenames =
        validFields[field](entrypoint, "unscoped-package-name") ===
        entrypoint.json[field];
      if (
        isUsingOldDistFilenames &&
        !projectsShownOldDistNamesInfo.has(entrypoint.package.project)
      ) {
        projectsShownOldDistNamesInfo.add(entrypoint.package.project);
        logger.info(
          `it looks like you're using the dist filenames of Preconstruct v1, the default dist filename strategy has changed in v2`
        );
        logger.info(
          `you can run ${chalk.green(
            "preconstruct fix"
          )} to use the new dist filenames`
        );
        logger.info(
          'if you want to keep the dist filename strategy of v1, add `"distFilenameStrategy": "unscoped-package-name"` to the Preconstruct config in your root package.json'
        );
      }
      fatalErrors.push(
        // they're both fixable but we don't want the message about running preconstruct fix if they're using the old dist file names since we have a custom message
        new (isUsingOldDistFilenames ? FatalError : FixableError)(
          errors.invalidField(
            field,
            entrypoint.json[field],
            validFields[field](entrypoint)
          ),
          entrypoint.name
        )
      );
    }
    if (field === "umd:main" && !isUmdNameSpecified(entrypoint)) {
      fatalErrors.push(
        new FixableError(errors.umdNameNotSpecified, entrypoint.name)
      );
    }
    if (log && !fatalErrors.length) {
      logger.info(infos.validField(field), entrypoint.name);
    }
  }
  if (fatalErrors.length) {
    throw new BatchError(fatalErrors);
  }
}

const FORMER_FLAGS_THAT_ARE_ENABLED_NOW = new Set([]);

export const EXPERIMENTAL_FLAGS = new Set([
  "useSourceInsteadOfGeneratingTSDeclarations",
  "useTSMorphToGenerateTSDeclarations",
  "logCompiledFiles",
  "newEntrypoints",
  "newDistFilenames",
  "newProcessEnvNodeEnvReplacementStrategyAndSkipTerserOnCJSProdBuild",
]);

export function validateProject(project: Project, log = false) {
  let errors: FatalError[] = [];
  if (project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH) {
    Object.keys(
      project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH
    ).forEach((key) => {
      if (FORMER_FLAGS_THAT_ARE_ENABLED_NOW.has(key)) {
        errors.push(
          new FixableError(
            `The behaviour from the experimental flag ${JSON.stringify(
              key
            )} is the current behaviour now, the flag should be removed`,
            project.name
          )
        );
      } else if (!EXPERIMENTAL_FLAGS.has(key)) {
        errors.push(
          new FixableError(
            `The experimental flag ${JSON.stringify(
              key
            )} in your config does not exist, the flag should be removed`,
            project.name
          )
        );
      }
    });
  }

  for (let pkg of project.packages) {
    try {
      validatePackage(pkg);
    } catch (err) {
      if (err instanceof BatchError) {
        errors.push(...err.errors);
      } else if (err instanceof FatalError) {
        errors.push(err);
      } else {
        throw err;
      }
    }
    for (let entrypoint of pkg.entrypoints) {
      try {
        validateEntrypoint(entrypoint, log);
      } catch (err) {
        if (err instanceof BatchError) {
          errors.push(...err.errors);
        } else if (err instanceof FatalError) {
          errors.push(err);
        } else {
          throw err;
        }
      }
    }
  }
  if (errors.length) {
    if (errors.length === 1) {
      throw errors[0];
    }
    throw new BatchError(errors);
  }
}

export default async function validate(directory: string) {
  let project: Project = await Project.create(directory);

  validateProject(project, true);

  logger.success(successes.validProject);
}
