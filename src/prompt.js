// @flow
import inquirer from "inquirer";
import throttle from "@jcoreio/async-throttle";
/*::
// this has to be in a comment because dependency import order reasons...
import { Package } from "./package";
*/
import DataLoader from "dataloader";

let isTest = process.env.NODE_ENV === "test";

// there might be a simpler solution to this than using dataloader but it works so ¯\_(ツ)_/¯

export function createPromptConfirmLoader(
  message: string
): JestMockFn<[Package], Promise<boolean> | boolean> {
  let loader = new DataLoader<Package, boolean>(
    async pkgs => {
      if (pkgs.length === 1) {
        let { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message
          }
        ]);
        return [confirm];
      }
      let { answers } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "answers",
          message,
          choices: pkgs.map(pkg => ({ name: pkg.name, checked: true }))
        }
      ]);
      return pkgs.map(pkg => {
        return answers.includes(pkg.name);
      });
    },
    { cache: false }
  );

  let ret = (pkg: Package) => loader.load(pkg);
  if (isTest) {
    // maybe do this in __mocks__ later
    ret = jest.fn<[Package], Promise<boolean> | boolean>();
  }
  // $FlowFixMe
  return ret;
}

// $FlowFixMe
export let promptInput: JestMockFn<
  [string, Package],
  string | Promise<string>
> = throttle(
  async (message: string, pkg: Package): Promise<string> => {
    let { input } = await inquirer.prompt([
      {
        type: "input",
        name: "input",
        message
      }
    ]);
    return input;
  }
);

if (isTest) {
  promptInput = jest.fn<[string, Package], string | Promise<string>>();
}
