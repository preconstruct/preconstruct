// @flow
import { Package } from "./package";
import { Project } from "./project";
import { promptInput } from "./prompt";
import { FatalError, FixableError } from "./errors";
import { success, info } from "./logger";
import { infos, confirms, errors, inputs } from "./messages";
import { isTsPath, getValidTypesField } from "./utils";
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
    info(infos.validMainField, pkg);
  } else {
    let canWriteMainField = await confirms.writeMainField(pkg);
    if (!canWriteMainField) {
      throw new FatalError(errors.deniedWriteMainField, pkg);
    }
    pkg.setFieldOnEntrypoints("main");
  }

  // TODO: think about making ts entrypoints all or nothing per package like other fields
  await Promise.all(
    pkg.entrypoints.map(async entrypoint => {
      if (isTsPath(entrypoint.source)) {
        let canWriteTypesField = await confirms.writeTypesField(pkg);
        if (!canWriteTypesField) {
          throw new FatalError(errors.deniedWriteTypesField, pkg);
        }
        entrypoint.tsTypes = getValidTypesField(entrypoint);
      }
    })
  );

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
      throw new FixableError(errors.invalidModuleField, pkg);
    }
  } else {
    info(infos.validModuleField, pkg);
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
      throw new FixableError(errors.invalidUmdMainField, pkg);
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
      throw new FixableError(errors.invalidBrowserField, pkg);
    }
  }

  await Promise.all(pkg.entrypoints.map(x => x.save()));
}

export default async function init(directory: string) {
  let project = await Project.create(directory);

  await Promise.all(project.packages.map(doInit));

  if (project.json.scripts && project.json.scripts.postinstall) {
    if (!project.json.scripts.postinstall.includes("preconstruct dev")) {
      info(
        "your project already has a postinstall script. you should add `preconstruct dev` to it manually"
      );
    }
  } else {
    let shouldAddPreconstructDevToPostinstall = await confirms.addPreconstructDevToPostinstall(
      project
    );
    if (shouldAddPreconstructDevToPostinstall) {
      if (!project.json.scripts) {
        project.json.scripts = {};
      }
      project.json.scripts.postinstall = "preconstruct dev";
      await project.save();
    }
  }

  success("initialised project!");
}
