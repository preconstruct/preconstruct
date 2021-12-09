import { Package } from "./package";
import { Project } from "./project";
import { promptInput } from "./prompt";
import { FatalError, FixableError } from "./errors";
import { success, info } from "./logger";
import { infos, confirms, errors, inputs } from "./messages";
import { isFieldValid, isUmdNameSpecified } from "./validate";

async function doInit(pkg: Package) {
  if (pkg.entrypoints.every((entrypoint) => isFieldValid.main(entrypoint))) {
    info(infos.validField("main"), pkg.name);
  } else {
    let canWriteMainField = await confirms.writeMainField(pkg);
    if (!canWriteMainField) {
      throw new FatalError(errors.deniedWriteMainField, pkg.name);
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
      throw new FixableError(
        errors.fieldMustExistInAllEntrypointsIfExistsDeclinedFixDuringInit(
          "module"
        ),
        pkg.name
      );
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
      throw new FixableError(
        errors.fieldMustExistInAllEntrypointsIfExistsDeclinedFixDuringInit(
          "umd:main"
        ),
        pkg.name
      );
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
      throw new FixableError(
        errors.fieldMustExistInAllEntrypointsIfExistsDeclinedFixDuringInit(
          "browser"
        ),
        pkg.name
      );
    }
  }

  let someEntrypointsHaveAWorkerField = pkg.entrypoints.some(
    (entrypoint) => entrypoint.json.worker !== undefined
  );

  let someEntrypointsHaveAnInvalidWorkerField = pkg.entrypoints.some(
    (entrypoint) => !isFieldValid.worker(entrypoint)
  );
  if (
    someEntrypointsHaveAWorkerField &&
    someEntrypointsHaveAnInvalidWorkerField
  ) {
    let shouldFixWorkerField = await confirms.fixWorkerField(pkg);
    if (shouldFixWorkerField) {
      pkg.setFieldOnEntrypoints("worker");
    } else {
      throw new FixableError(
        errors.fieldMustExistInAllEntrypointsIfExistsDeclinedFixDuringInit(
          "worker"
        ),
        pkg.name
      );
    }
  }

  await Promise.all(pkg.entrypoints.map((x) => x.save()));
}

export default async function init(directory: string) {
  let project = await Project.create(directory);

  await Promise.all(project.packages.map(doInit));

  success("initialised project!");
}
