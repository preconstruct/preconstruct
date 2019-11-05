#!/usr/bin/env node
"use strict";
let chalk = require("chalk");
console.error(
  "🎁" +
    chalk.red("error") +
    " The preconstruct package has been renamed to @preconstruct/cli, please install that instead"
);

process.exit(1);
