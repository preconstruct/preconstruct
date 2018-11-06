// @flow
"use strict";
import chalk from "chalk";

let preconstructEmoji = "🎁 ";

export function error(error /*:string*/) {
  console.error(preconstructEmoji + chalk.red("error"), error);
}

export function success(message /*:string*/) {
  console.log(preconstructEmoji + chalk.green("success"), message);
}

export function info(message /*:string*/) {
  console.log(preconstructEmoji + chalk.cyan("info"), message);
}
