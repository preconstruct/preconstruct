import { Entrypoint } from "./entrypoint";
import { Project } from "./project";
import { promptInput } from "./prompt";
import * as logger from "./logger";
import { inputs } from "./messages";
import {
  validateEntrypointSource,
  isUmdNameSpecified,
  EXPERIMENTAL_FLAGS,
  FORMER_FLAGS_THAT_ARE_ENABLED_NOW,
} from "./validate";
import { fixPackage } from "./validate-package";
import { BatchError, FatalError } from "./errors";

async function fixEntrypoint(entrypoint: Entrypoint) {
  let hasBeenModified = false;
  // we're only doing this on entrypoints that aren't at the root of the package
  // because at the root of the package, you're less likely to want to change the entrypoint source
  if (entrypoint.directory !== entrypoint.package.directory) {
    try {
      entrypoint.source;
    } catch (err) {
      if (err.code === "MODULE_NOT_FOUND") {
        let val = await promptInput(inputs.getSource, entrypoint, "src/index");
        if (
          val !== "src/index" &&
          val !== "src/index.js" &&
          val !== "src/index.jsx" &&
          val !== "src/index.ts" &&
          val !== "src/index.tsx"
        ) {
          entrypoint.json.preconstruct.source = val;
          hasBeenModified = true;
        } else {
          logger.info(
            `${val} is the default value for source files so it will not be written`
          );
        }
      } else {
        throw err;
      }
    }
  }
  validateEntrypointSource(entrypoint);

  if (
    entrypoint.json["umd:main"] !== undefined &&
    !isUmdNameSpecified(entrypoint)
  ) {
    let umdName = await promptInput(inputs.getUmdName, entrypoint);
    entrypoint.json.preconstruct.umdName = umdName;
    hasBeenModified = true;
  }
  if (hasBeenModified) {
    await entrypoint.save();
  }
  return hasBeenModified;
}

export default async function fix(directory: string) {
  let project = await Project.create(directory, true);
  let didModifyProject = false;
  if (project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH) {
    let errors: FatalError[] = [];
    Object.keys(
      project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH
    ).forEach((key) => {
      if (FORMER_FLAGS_THAT_ARE_ENABLED_NOW.has(key)) {
        didModifyProject = true;
        delete (project.json.preconstruct
          .___experimentalFlags_WILL_CHANGE_IN_PATCH as any)[key];
      } else if (!EXPERIMENTAL_FLAGS.has(key)) {
        errors.push(
          new FatalError(
            `The experimental flag ${JSON.stringify(
              key
            )} in your config does not exist`,
            project.name
          )
        );
      }
    });
    if (didModifyProject) {
      if (
        Object.keys(
          project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH
        ).length === 0
      ) {
        delete (project.json.preconstruct as any)
          .___experimentalFlags_WILL_CHANGE_IN_PATCH;
      }
      await project.save();
    }
    if (errors.length) {
      throw new BatchError(errors);
    }
  }

  let didModifyPackages = (
    await Promise.all(
      project.packages.map(async (pkg) => {
        let didModifyInPkgFix = await fixPackage(pkg);
        let didModifyInEntrypointsFix = (
          await Promise.all(pkg.entrypoints.map(fixEntrypoint))
        ).some((x) => x);
        return didModifyInPkgFix || didModifyInEntrypointsFix;
      })
    )
  ).some((x) => x);

  logger.success(
    didModifyProject || didModifyPackages
      ? "fixed project!"
      : "project already valid!"
  );
}
