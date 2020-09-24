import { Package } from "./package";
import { Project } from "./project";
import { promptInput } from "./prompt";
import { FatalError, FixableError } from "./errors";
import { success, info } from "./logger";
import { infos, confirms, errors, inputs } from "./messages";
import {
  validateEntrypointSource,
  isFieldValid,
  isUmdNameSpecified,
} from "./validate";
import { validFields } from "./utils";

async function doInit(pkg: Package) {
  pkg.entrypoints.forEach((entrypoint) => {
    validateEntrypointSource(entrypoint);
  });
  if (pkg.entrypoints.every((entrypoint) => isFieldValid.main(entrypoint))) {
    info(infos.validField("main"), pkg.name);
  } else {
    let canWriteMainField = await confirms.writeMainField(pkg);
    if (!canWriteMainField) {
      throw new FatalError(errors.deniedWriteMainField, pkg.name);
    }
    if (pkg.project.experimentalFlags.nodeESM) {
      const valid = validFields.exports(pkg);
      if (JSON.stringify(pkg.json.exports) !== JSON.stringify(valid)) {
        pkg.json.exports = valid;
        await pkg.save();
      }
    }

    pkg.setFieldOnEntrypoints("main");
  }

  let allEntrypointsAreMissingAModuleField = pkg.entrypoints.every(
    (entrypoint) => entrypoint.json.module === undefined
  );
  let someEntrypointsAreNotValid = pkg.entrypoints.some(
    (entrypoint) => !isFieldValid.module(entrypoint)
  );
  if (allEntrypointsAreMissingAModuleField || someEntrypointsAreNotValid) {
    let canWriteModuleField = await confirms.writeModuleField(pkg);
    if (canWriteModuleField) {
      pkg.setFieldOnEntrypoints("module");
    } else if (!allEntrypointsAreMissingAModuleField) {
      throw new FixableError(errors.invalidField("module"), pkg.name);
    }
  } else {
    info(infos.validField("module"), pkg.name);
  }

  let someEntrypointsHaveAMaybeInvalidUmdBuild = pkg.entrypoints.some(
    (entrypoint) => entrypoint.json["umd:main"] !== undefined
  );
  let someUmdMainFieldsAreInvalid = pkg.entrypoints.some(
    (entrypoint) => !isFieldValid["umd:main"](entrypoint)
  );
  let someUmdNamesAreNotSpecified = pkg.entrypoints.some(
    (entrypoint) => !isUmdNameSpecified(entrypoint)
  );
  if (
    someEntrypointsHaveAMaybeInvalidUmdBuild &&
    (someUmdMainFieldsAreInvalid || someUmdNamesAreNotSpecified)
  ) {
    let shouldWriteUMDBuilds = await confirms.fixUmdBuild(pkg);
    if (shouldWriteUMDBuilds) {
      pkg.setFieldOnEntrypoints("umd:main");
      for (let entrypoint of pkg.entrypoints) {
        let umdName = await promptInput(inputs.getUmdName, entrypoint);
        entrypoint.json.preconstruct.umdName = umdName;
      }
    } else {
      throw new FixableError(errors.invalidField("umd:main"), pkg.name);
    }
  }

  let someEntrypointsHaveABrowserField = pkg.entrypoints.some(
    (entrypoint) => entrypoint.json.browser !== undefined
  );

  let someEntrypointsHaveAnInvalidBrowserField = pkg.entrypoints.some(
    (entrypoint) => !isFieldValid.browser(entrypoint)
  );
  if (
    someEntrypointsHaveABrowserField &&
    someEntrypointsHaveAnInvalidBrowserField
  ) {
    let shouldFixBrowserField = await confirms.fixBrowserField(pkg);
    if (shouldFixBrowserField) {
      pkg.setFieldOnEntrypoints("browser");
    } else {
      throw new FixableError(errors.invalidField("browser"), pkg.name);
    }
  }

  await Promise.all(pkg.entrypoints.map((x) => x.save()));
}

export default async function init(directory: string) {
  let project = await Project.create(directory);

  await Promise.all(project.packages.map(doInit));

  success("initialised project!");
}
