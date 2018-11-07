// @flow
import inquirer from "inquirer";

export async function promptConfirm(message: string): Promise<boolean> {
  let { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message
    }
  ]);
  // $FlowFixMe
  return confirm;
}

export async function promptInput(message: string): Promise<string> {
  let { input } = await inquirer.prompt([
    {
      type: "input",
      name: "input",
      message
    }
  ]);
  return input;
}
