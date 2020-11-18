import { Entrypoint } from "./entrypoint";
import { Project } from "./project";
import { promptInput } from "./prompt";
import * as logger from "./logger";
import { inputs } from "./messages";
import {
  isUmdNameSpecified,
  EXPERIMENTAL_FLAGS,
  FORMER_FLAGS_THAT_ARE_ENABLED_NOW,
} from "./validate";
import { fixPackage } from "./validate-package";
import { BatchError, FatalError } from "./errors";

async function fixEntrypoint(entrypoint: Entrypoint) {
  if (
    entrypoint.json["umd:main"] !== undefined &&
    !isUmdNameSpecified(entrypoint)
  ) {
    let umdName = await promptInput(inputs.getUmdName, entrypoint);
    entrypoint.json.preconstruct.umdName = umdName;
    await entrypoint.save();
    return true;
  }
  return false;
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
