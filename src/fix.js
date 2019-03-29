// @flow
import { Entrypoint } from "./entrypoint";
import { Project } from "./project";
import { promptInput } from "./prompt";
import { success } from "./logger";
import { inputs } from "./messages";
import { validateEntrypointSource, isUmdNameSpecified } from "./validate";
import { fixPackage } from "./validate-package";

async function fixEntrypoint(entrypoint: Entrypoint) {
  validateEntrypointSource(entrypoint);
  if (entrypoint.umdMain !== null && !isUmdNameSpecified(entrypoint)) {
    let umdName = await promptInput(inputs.getUmdName, entrypoint);
    entrypoint.umdName = umdName;
  }
  return entrypoint.save();
}

export default async function fix(directory: string) {
  let { packages } = await Project.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  let didModify = (await Promise.all(
    packages.map(async pkg => {
      let didModify = await fixPackage(pkg);
      return (
        didModify ||
        (await Promise.all(pkg.entrypoints.map(fixEntrypoint))).some(x => x)
      );
    })
  )).some(x => x);

  let obj = packages.length > 1 ? "packages" : "package";
  success(didModify ? `fixed ${obj}!` : `${obj} already valid!`);
}
