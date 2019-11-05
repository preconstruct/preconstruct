import { PKG_JSON_CONFIG_FIELD } from "./constants";

export let errors = {
  noSource: (source: string) =>
    `no source file was provided, please create a file at ${source} or specify a custom source file with the ${PKG_JSON_CONFIG_FIELD} source option`,
  deniedWriteMainField: "changing the main field is required to build",
  invalidModuleField: "module field is invalid",
  invalidMainField: "main field is invalid",
  invalidUmdMainField: "umd:main field is invalid",
  invalidBrowserField: "browser field is invalid",
  umdNameNotSpecified: `the umd:main field is specified but a umdName option is not specified. please add it to the ${PKG_JSON_CONFIG_FIELD} field in your package.json`,
  noEntrypointPkgJson: "There is a missing package.json for an entrypoint",
  noEntrypoints:
    "packages must have at least one entrypoint, this package has no entrypoints"
};

import { createPromptConfirmLoader } from "./prompt";

export let confirms = {
  writeMainField: createPromptConfirmLoader(
    "preconstruct is going to change the main field in your package.json, are you okay with that?"
  ),
  writeModuleField: createPromptConfirmLoader(
    "would you like to generate module builds? this will write to the module field in your package.json"
  ),
  fixModuleField: createPromptConfirmLoader(
    "would you like to fix the module field?"
  ),
  fixUmdBuild: createPromptConfirmLoader(
    "would you like to fix the umd field?"
  ),
  fixBrowserField: createPromptConfirmLoader(
    "would you like to fix the browser build?"
  ),
  createEntrypointPkgJson: createPromptConfirmLoader(
    "A package.json file does not exist for this entrypoint, would you like to create one automatically?"
  ),
  createEntrypoint: createPromptConfirmLoader(
    "This glob does not match anything, would you like to create an entrypoint for it?"
  )
};

export let inputs = {
  getUmdName: "what should the name used for UMD bundles be?",
  getSource: "what should the source file for this entrypoint be?"
};

export let infos = {
  validMainField: "main field is valid",
  validModuleField: "module field is valid",
  validUmdMainField: "umd:main field is valid",
  validEntrypoint: "a valid entry point exists.",
  validBrowserField: "browser field is valid",
  validPackageEntrypoints: "package entrypoints are valid"
};

export let successes = {
  validProject: "project is valid!",
  startedWatching: "started watching!"
};
