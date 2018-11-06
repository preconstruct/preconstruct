// @flow
"use strict";
let Package = require("./package");
let path = require("path");
let fs = require("fs-extra");
let { promptConfirm } = require("./prompt");
let { FatalError } = require("./errors");
let { success, error, info } = require("./logger");

let errors = {
  noEntryPoint:
    "No entrypoint was provided. Please create a file at src/index.js",
  deniedWriteMainField: "Changing the main field is required...",
  invalidModuleField:
    "The module field is in an invalid state. Initialiation cannot continue unless it is fixed"
};

let confirms = {
  writeMainField:
    "preconstruct is going to change the main field in your package.json, are you okay with that?",
  writeModuleField:
    "Would you like to generate module builds? This will write to the module field in your package.json",
  fixModuleField: "Would you like to fix the module field?"
};

let infos = {
  validMainField: "main field is valid. No change required",
  validModuleField: "module field is valid. No change required"
};

async function doInit(pkg /*:Package*/) {
  let usableName = pkg.name.replace(/.*\//, "");
  try {
    require.resolve(path.join(pkg.directory, "src"));
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new FatalError(errors.noEntryPoint);
    }
    throw e;
  }
  let correctMainField = `dist/${usableName}.cjs.js`;
  if (correctMainField !== pkg.main) {
    let canWriteMainField = await promptConfirm(confirms.writeMainField);
    if (!canWriteMainField) {
      throw new FatalError(errors.deniedWriteMainField);
    }
  } else {
    info(infos.validMainField);
  }

  pkg.main = correctMainField;
  let correctModuleField = `dist/${usableName}.esm.js`;
  if (correctModuleField !== pkg.module) {
    let canWriteModuleField = await promptConfirm(confirms.writeModuleField);
    if (canWriteModuleField) {
      pkg.module = correctModuleField;
    } else if (pkg.module) {
      error(errors.invalidModuleField);
      let shouldFixModuleField = await promptConfirm(confirms.fixModuleField);
      if (!shouldFixModuleField) {
        throw new FatalError(errors.invalidModuleField);
      }
      pkg.module = correctModuleField;
    }
  } else {
    info(infos.validModuleField);
  }
  // ask if user wants umd build
  // check if there is a browser option and if it's invalid, offer to fix it
  await pkg.save();
}

module.exports = exports = async function init(directory /*: string*/) {
  let pkg = await Package.create(path.join(directory));
  // do more stuff with checking whether the repo is yarn workspaces or bolt monorepo

  // todo: figure out why this is empty without the declaration
  let workspaces /*:null|Array<Package>*/ = await pkg.packages();
  if (workspaces === null) {
    await doInit(pkg);
  } else {
    // todo: figure out a way to make the validation parallel(how should the prompts work? batch all prompts of the same type? dataloader-style)
    for (let workspace of workspaces) {
      await doInit(workspace);
    }
  }
  success("Initialised package!");
};

Object.assign(exports, { confirms, errors, infos });
