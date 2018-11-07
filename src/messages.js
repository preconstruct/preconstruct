// @flow

export let errors = {
  noEntryPoint:
    "no entrypoint was provided, please create a file at src/index.js",
  deniedWriteMainField:
    "changing the main field is required for preconstruct to build",
  invalidModuleField: "module field is invalid",
  invalidMainField: "main field is invalid",
  invalidUmdMainField: "umd:main field is invalid",
  umdNameNotSpecified:
    "the umd:main field is specified but a umdName option is not specified. please add it to the preconstruct field in your package.json"
};

export let confirms = {
  writeMainField:
    "preconstruct is going to change the main field in your package.json, are you okay with that?",
  writeModuleField:
    "would you like to generate module builds? this will write to the module field in your package.json",
  fixModuleField: "would you like to fix the module field?",
  writeUmdBuilds: "would you like to generate UMD builds?"
};

export let inputs = {
  getUmdName: "what should the name used for UMD bundles be?"
};

export let infos = {
  validMainField: "main field is valid",
  validModuleField: "module field is valid",
  validUmdMainField: "umd:main field is valid",
  validEntrypoint: "a valid entry point exists."
};

export let successes = {
  validPackage: "package is valid!"
};
