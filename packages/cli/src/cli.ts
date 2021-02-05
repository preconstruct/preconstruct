import meow from "meow";
import init from "./init";
import validate from "./validate";
import build from "./build";
import watch from "./build/watch";
import fix from "./fix";
import dev from "./dev";
import { error, info, log } from "./logger";
import {
  FatalError,
  FixableError,
  UnexpectedBuildError,
  ScopelessError,
  BatchError,
} from "./errors";

// tricking static analysis is fun
// @ts-ignore
process["e" + "nv"].NODE_ENV = "production";

let { input } = meow(
  `
Usage
  $ preconstruct [command]
Commands
  init         initialise a project
  build        build the project
  watch        start a watch process to build the project
  validate     validate the project
  fix          infer as much information as possible and fix the project
  dev          create links so entrypoints can be imported

`,
  {}
);

let errors = {
  commandNotFound: "Command not found",
};

class CommandNotFoundError extends Error {}

(async () => {
  if (input.length === 1) {
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
      case "fix": {
        await fix(process.cwd());
        return;
      }
      case "dev": {
        await dev(process.cwd());
        return;
      }
      default: {
        throw new CommandNotFoundError();
      }
    }
  } else {
    throw new CommandNotFoundError();
  }
})().catch((err) => {
  let hasFixableError = false;
  if (err instanceof FixableError) {
    hasFixableError = true;
    error(err.message, err.scope);
  } else if (err instanceof FatalError) {
    error(err.message, err.scope);
  } else if (err instanceof BatchError) {
    for (let fatalError of err.errors) {
      if (fatalError instanceof FixableError) {
        hasFixableError = true;
        error(fatalError.message, fatalError.scope);
      } else {
        error(fatalError.message, fatalError.scope);
      }
    }
  } else if (err instanceof CommandNotFoundError) {
    error(errors.commandNotFound);
  } else if (err instanceof UnexpectedBuildError) {
    error(err.message, err.scope);
  } else if (err instanceof ScopelessError) {
    log(err.message);
  } else {
    error(err);
  }
  if (hasFixableError) {
    info(
      "Some of the errors above can be fixed automatically by running preconstruct fix"
    );
  }
  info(
    "If want to learn more about the above error, check https://preconstruct.tools/errors"
  );
  info(
    "If the error is not there and you want to learn more about it, open an issue at https://github.com/preconstruct/preconstruct/issues/new"
  );
  process.exit(1);
});
