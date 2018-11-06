// @flow
let Package = require("./package");
let path = require("path");
let fs = require("fs-extra");
let { promptConfirm } = require("./prompt");

let errors = {
  noEntryPoint:
    "No entrypoint was provided. Please create a file at src/index.js",
  deniedWriteMainField: "Changing the main field is required..."
};

let confirms = {
  writeMainField:
    "preconstruct is going to change the main field in your package.json, are you okay with that?",
  writeModuleField:
    "Would you like to generate module builds? This will write to the module field in your package.json"
};

async function doInit(pkg /*:Package*/) {
  try {
    require.resolve(path.join(pkg.directory, "src"));
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new Error(errors.noEntryPoint);
    }
    throw e;
  }

  let canWriteMainField = await promptConfirm(confirms.writeMainField);
  if (!canWriteMainField) {
    throw new Error(errors.deniedWriteMainField);
  }
  pkg.main = `dist/${pkg.name.replace(/.*\//, "")}.cjs.js`;
  let canWriteModuleField = await promptConfirm(confirms.writeModuleField);
  if (canWriteModuleField) {
    pkg.module = `dist/${pkg.name.replace(/.*\//, "")}.esm.js`;
  }
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
};

Object.assign(exports, { confirms, errors });
