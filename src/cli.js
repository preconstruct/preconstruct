// @flow
import meow from "meow";
import init from "./init";
import validate from "./validate";
import build from "./build";
import watch from "./build/watch";
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

class CommandNotFoundError extends Error {}

(async () => {
  if (input.length === 1) {
    try {
      switch (input[0]) {
        case "init": {
          await init(process.cwd());
          return;
        }
        case "validate": {
          await validate(process.cwd());
          return;
        }
        case "build": {
          await build(process.cwd());
          return;
        }
        case "watch": {
          await watch(process.cwd());
          return;
        }

        default: {
          throw new CommandNotFoundError();
        }
      }
    } catch (err) {
      if (err instanceof FatalError) {
        error(err.message, err.package);
      } else if (err instanceof CommandNotFoundError) {
        error(errors.commandNotFound);
      } else {
        throw err;
      }
    }
  } else {
    error(errors.commandNotFound);
  }
})();
