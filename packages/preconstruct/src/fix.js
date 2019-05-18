// @flow
import { Entrypoint } from "./entrypoint";
import { Project } from "./project";
import { promptInput } from "./prompt";
import { success } from "./logger";
import { inputs } from "./messages";
import {
  validateEntrypointSource,
  isUmdNameSpecified,
  isTypesFieldValid
} from "./validate";
import { getValidTypesField, isTsPath } from "./utils";
import { fixPackage } from "./validate-package";

async function fixEntrypoint(entrypoint: Entrypoint) {
  validateEntrypointSource(entrypoint);

  if (isTsPath(entrypoint.source) && !isTypesFieldValid(entrypoint)) {
    entrypoint.tsTypes = getValidTypesField(entrypoint);
  }

  if (entrypoint.umdMain !== null && !isUmdNameSpecified(entrypoint)) {
    let umdName = await promptInput(inputs.getUmdName, entrypoint);
    entrypoint.umdName = umdName;
  }
  return entrypoint.save();
}

export default async function fix(directory: string) {
  let { packages } = await Project.create(directory);

  let didModify = (await Promise.all(
    packages.map(async pkg => {
      let didModifyInPkgFix = await fixPackage(pkg);
      let didModifyInEntrypointsFix = (await Promise.all(
        pkg.entrypoints.map(fixEntrypoint)
      )).some(x => x);
      return didModifyInPkgFix || didModifyInEntrypointsFix;
    })
  )).some(x => x);

  success(didModify ? "fixed project!" : "project already valid!");
}
