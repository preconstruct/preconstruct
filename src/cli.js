// @flow
"use strict";

import meow from "meow";
import init from "./init";
import { error } from "./logger";
import { FatalError } from "./errors";

let { input } = meow(
  `
Usage
  $ preconstruct [command]
Commands
  init         initialise preconstruct
  build        build the package(s)
  watch        start a watch process to build the package(s)
  validate     validate the package(s)
`,
  {}
);

let errors = {
  commandNotFound: "Command not found"
};

(async () => {
  if (input.length === 1) {
    switch (input[0]) {
      case "init": {
        try {
          await init(process.cwd());
        } catch (err) {
          if (err instanceof FatalError) {
            error(err.message);
          } else {
            throw err;
          }
        }
        break;
      }
      default: {
        error(errors.commandNotFound);
      }
    }
  } else {
    error(errors.commandNotFound);
  }
})();
