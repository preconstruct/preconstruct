import enquirer from "enquirer";
import pLimit from "p-limit";
import DataLoader from "dataloader";
import chalk from "chalk";

export let limit = pLimit(1);

// there might be a simpler solution to this than using dataloader but it works so ¯\_(ツ)_/¯

let prefix = `🎁 ${chalk.green("?")}`;

type NamedThing = { readonly name: string };

export function createPromptConfirmLoader(
  message: string
): (pkg: NamedThing) => Promise<boolean> {
  let loader = new DataLoader<NamedThing, boolean>(pkgs =>
    limit(() =>
      (async () => {
        if (pkgs.length === 1) {
          let { confirm } = await enquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message,
              // @ts-ignore
              prefix: prefix + " " + pkgs[0].name,
              initial: true
            }
          ]);
          return [confirm];
        }
        let { answers } = await enquirer.prompt([
          {
            type: "multiselect",
            name: "answers",
            message,
            choices: pkgs.map(pkg => ({ name: pkg.name, initial: true })),
            // @ts-ignore
            prefix
          }
        ]);
        return pkgs.map(pkg => {
          return answers.includes(pkg.name);
        });
      })()
    )
  );

  return (pkg: NamedThing) => loader.load(pkg);
}

export let promptConfirm = async (message: string): Promise<boolean> => {
  let { confirm } = await enquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message,
      // @ts-ignore
      prefix: prefix,
      initial: true
    }
  ]);
  return confirm;
};

export let doPromptInput = async (
  message: string,
  pkg: { name: string },
  defaultAnswer?: string
): Promise<string> => {
  let { input } = await enquirer.prompt([
    {
      type: "input",
      name: "input",
      message,
      // @ts-ignore
      prefix: prefix + " " + pkg.name,
      initial: defaultAnswer
    }
  ]);
  return input;
};

export let promptInput = (
  message: string,
  pkg: { name: string },
  defaultAnswer?: string
) => limit(() => doPromptInput(message, pkg, defaultAnswer));
