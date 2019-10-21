import { Entrypoint } from "./entrypoint";
import { Project } from "./project";
import { promptInput } from "./prompt";
import * as logger from "./logger";
import { inputs } from "./messages";
import { validateEntrypointSource, isUmdNameSpecified } from "./validate";
import { fixPackage } from "./validate-package";

async function fixEntrypoint(entrypoint: Entrypoint) {
  // we're only doing this on entrypoints that aren't at the root of the package
  // because at the root of the package, you're less likely to want to change the entrypoint source
  if (entrypoint.directory !== entrypoint.package.directory) {
    try {
      entrypoint.source;
    } catch (err) {
      if (err.code === "MODULE_NOT_FOUND") {
        let val = await promptInput(
          "what should the source",
          entrypoint,
          "src/index"
        );
        if (
          val !== "src/index" &&
          val !== "src/index.js" &&
          val !== "src/index.jsx" &&
          val !== "src/index.ts" &&
          val !== "src/index.tsx"
        ) {
          entrypoint._config.source = val;
          await entrypoint.save();
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

  if (entrypoint.umdMain !== null && !isUmdNameSpecified(entrypoint)) {
    let umdName = await promptInput(inputs.getUmdName, entrypoint);
    entrypoint.umdName = umdName;
    await entrypoint.save();

    return true;
  }
  return false;
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

  logger.success(didModify ? "fixed project!" : "project already valid!");
}
