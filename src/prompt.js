// @flow
import inquirer from "inquirer";
import pLimit from "p-limit";
/*::
// this has to be in a comment because dependency import order reasons...
import { Package } from "./package";
*/
import DataLoader from "dataloader";
import chalk from "chalk";

let isTest = process.env.NODE_ENV === "test";

let limit = pLimit(1);

// there might be a simpler solution to this than using dataloader but it works so ¯\_(ツ)_/¯

let confirmPrefix = `🎁 ${chalk.green("?")} `;

export function createPromptConfirmLoader(
  message: string
): (pkg: Package) => boolean {
  let loader = new DataLoader<Package, boolean>(pkgs =>
    limit(
      () =>
        (async () => {
          if (pkgs.length === 1) {
            let { confirm } = await inquirer.prompt([
              {
                type: "confirm",
                name: "confirm",
                message,
                prefix: confirmPrefix + pkgs[0].name
              }
            ]);
            return [confirm];
          }
          let { answers } = await inquirer.prompt([
            {
              type: "checkbox",
              name: "answers",
              message,
              choices: pkgs.map(pkg => ({ name: pkg.name, checked: true })),
              prefix: confirmPrefix
            }
          ]);
          return pkgs.map(pkg => {
            return answers.includes(pkg.name);
          });
        })(),
      { cache: false }
    )
  );

  let ret = (pkg: Package) => loader.load(pkg);
  if (isTest) {
    // maybe do this in __mocks__ later
    ret = jest.fn<any, any>();
  }
  // $FlowFixMe
  return ret;
}

let doPromptInput = async (message: string, pkg: Package): Promise<string> => {
  let { input } = await inquirer.prompt([
    {
      type: "input",
      name: "input",
      message,
      prefix: pkg.name
    }
  ]);
  return input;
};
export let promptInput = (message: string, pkg: Package) =>
  limit(() => doPromptInput(message, pkg));

if (isTest) {
  promptInput = jest.fn<[string, Package], string | Promise<string>>();
}
