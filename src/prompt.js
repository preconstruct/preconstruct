// @flow
import inquirer from "inquirer";

export async function promptConfirm(message: string): boolean {
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
