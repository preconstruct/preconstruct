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

module.exports = exports = async function init(directory /*: string*/) {
  let pkg = await Package.create(path.join(directory, "package.json"));
  try {
    require.resolve(path.join(directory, "src"));
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
};

Object.assign(exports, { confirms, errors });
