// @flow
"use strict";
let chalk = require("chalk");

let preconstructEmoji = "🎁 ";

function error(error /*:string*/) {
  console.error(preconstructEmoji + chalk.red("error"), error);
}

function success(message /*:string*/) {
  console.log(preconstructEmoji + chalk.green("success"), message);
}

function info(message /*:string*/) {
  console.log(preconstructEmoji + chalk.cyan("info"), message);
}

module.exports = { error, success, info };
