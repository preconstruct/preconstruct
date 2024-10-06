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
  let loader = new DataLoader<NamedThing, boolean>((pkgs) =>
    limit(() =>
      (async () => {
        if (pkgs.length === 1) {
          // @ts-ignore
          let { confirm } = await enquirer.prompt([
            {
              // @ts-ignore
              type: "confirm",
              name: "confirm",
              message,
              // @ts-ignore
              prefix: prefix + " " + pkgs[0].name,
              initial: true,
            },
          ]);
          return [confirm];
        }
        // @ts-ignore
        let { answers } = await enquirer.prompt([
          {
            type: "multiselect" as const,
            name: "answers",
            message,
            choices: pkgs.map((pkg) => ({ name: pkg.name, initial: true })),
            // @ts-ignore
            prefix,
          },
        ]);
        return pkgs.map((pkg) => {
          return answers.includes(pkg.name);
        });
      })()
    )
  );

  return (pkg: NamedThing) => loader.load(pkg);
}

export let doPromptInput = async (
  message: string,
  pkg: { name: string },
  defaultAnswer?: string
): Promise<string> => {
  // @ts-ignore
  let { input } = await enquirer.prompt([
    {
      // @ts-ignore
      type: "input",
      name: "input",
      message,
      // @ts-ignore
      prefix: prefix + " " + pkg.name,
      initial: defaultAnswer,
    },
  ]);
  return input;
};

export let promptInput = (
  message: string,
  pkg: { name: string },
  defaultAnswer?: string
) => limit(() => doPromptInput(message, pkg, defaultAnswer));
