// @flow
let inquirer = require("inquirer");

exports.promptConfirm = async function promptConfirm(
  question /*:string*/
) /*: boolean*/ {
  let { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      question
    }
  ]);
  // $FlowFixMe
  return confirm;
};
