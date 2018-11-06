// @flow
"use strict";
let chalk = require("chalk");

let preconstructEmoji = "🎁 ";

function error(error /*:string*/) {
  console.error(preconstructEmoji + chalk.red("error"), error);
}

module.exports = { error };
