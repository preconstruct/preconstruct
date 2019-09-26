import { Package } from "./package";
import { Project } from "./project";
import { promptInput } from "./prompt";
import { FatalError, FixableError } from "./errors";
import { success, info } from "./logger";
import { infos, confirms, errors, inputs } from "./messages";
import {
  validateEntrypointSource,
  isMainFieldValid,
  isModuleFieldValid,
  isUmdMainFieldValid,
  isUmdNameSpecified,
  isBrowserFieldValid
} from "./validate";

async function doInit(pkg: Package) {
  pkg.entrypoints.forEach(entrypoint => {
    validateEntrypointSource(entrypoint);
  });
  if (pkg.entrypoints.every(entrypoint => isMainFieldValid(entrypoint))) {
    info(infos.validMainField, pkg.name);
  } else {
    let canWriteMainField = await confirms.writeMainField(pkg);
    if (!canWriteMainField) {
      throw new FatalError(errors.deniedWriteMainField, pkg.name);
    }
    pkg.setFieldOnEntrypoints("main");
  }

  let allEntrypointsAreMissingAModuleField = pkg.entrypoints.every(
    entrypoint => entrypoint.module === null
  );
  let someEntrypointsAreNotValid = pkg.entrypoints.some(
    entrypoint => !isModuleFieldValid(entrypoint)
  );
  if (allEntrypointsAreMissingAModuleField || someEntrypointsAreNotValid) {
    let canWriteModuleField = await confirms.writeModuleField(pkg);
    if (canWriteModuleField) {
      pkg.setFieldOnEntrypoints("module");
    } else if (!allEntrypointsAreMissingAModuleField) {
      throw new FixableError(errors.invalidModuleField, pkg.name);
    }
  } else {
    info(infos.validModuleField, pkg.name);
  }

  let someEntrypointsHaveAMaybeInvalidUmdBuild = pkg.entrypoints.some(
    entrypoint => entrypoint.umdMain !== null
  );
  let someUmdMainFieldsAreInvalid = pkg.entrypoints.some(
    entrypoint => !isUmdMainFieldValid(entrypoint)
  );
  let someUmdNamesAreNotSpecified = pkg.entrypoints.some(
    entrypoint => !isUmdNameSpecified(entrypoint)
  );
  if (
    someEntrypointsHaveAMaybeInvalidUmdBuild &&
    (someUmdMainFieldsAreInvalid || someUmdNamesAreNotSpecified)
  ) {
    let shouldWriteUMDBuilds = await confirms.fixUmdBuild(pkg);
    if (shouldWriteUMDBuilds) {
      pkg.setFieldOnEntrypoints("umdMain");
      for (let entrypoint of pkg.entrypoints) {
        let umdName = await promptInput(inputs.getUmdName, entrypoint);
        entrypoint.umdName = umdName;
      }
    } else {
      throw new FixableError(errors.invalidUmdMainField, pkg.name);
    }
  }

  let someEntrypointsHaveABrowserField = pkg.entrypoints.some(
    entrypoint => entrypoint.browser !== null
  );

  let someEntrypointsHaveAnInvalidBrowserField = pkg.entrypoints.some(
    entrypoint => !isBrowserFieldValid(entrypoint)
  );
  if (
    someEntrypointsHaveABrowserField &&
    someEntrypointsHaveAnInvalidBrowserField
  ) {
    let shouldFixBrowserField = await confirms.fixBrowserField(pkg);
    if (shouldFixBrowserField) {
      pkg.setFieldOnEntrypoints("browser");
    } else {
      throw new FixableError(errors.invalidBrowserField, pkg.name);
    }
  }

  await Promise.all(pkg.entrypoints.map(x => x.save()));
}

export default async function init(directory: string) {
  let project = await Project.create(directory);

  await Promise.all(project.packages.map(doInit));

  success("initialised project!");
}
