// @flow
"use strict";
let inquirer = require("inquirer");

exports.promptConfirm = async function promptConfirm(
  message /*:string*/
) /*: boolean*/ {
  let { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message
    }
  ]);
  // $FlowFixMe
  return confirm;
};
