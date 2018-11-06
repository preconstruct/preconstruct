// @flow

export let errors = {
  noEntryPoint:
    "No entrypoint was provided. Please create a file at src/index.js",
  deniedWriteMainField: "Changing the main field is required...",
  invalidModuleField: "The module field is in an invalid state.",
  invalidMainField: "The main field is in an invalid state."
};

export let confirms = {
  writeMainField:
    "preconstruct is going to change the main field in your package.json, are you okay with that?",
  writeModuleField:
    "Would you like to generate module builds? This will write to the module field in your package.json",
  fixModuleField: "Would you like to fix the module field?"
};

export let infos = {
  validMainField: "main field is valid. No change required",
  validModuleField: "module field is valid. No change required",
  validEntrypoint: "a valid entry point exists."
};

export let successes = {
  validPackage: "package is valid!"
};
