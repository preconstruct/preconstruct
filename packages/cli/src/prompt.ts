import enquirer from "enquirer";
import pLimit from "p-limit";
import DataLoader from "dataloader";
import chalk from "chalk";

export let limit = pLimit(1);

// there might be a simpler solution to this than using dataloader but it works so ¯\_(ツ)_/¯

let prefix = `🎁 ${chalk.green("?")}`;

type NamedThing = { readonly name: string };

type PromptOverrides = {
  confirm?: (message: string, pkg: NamedThing) => Promise<boolean>;
  input?: (
    message: string,
    pkg: { name: string },
    defaultAnswer?: string
  ) => Promise<string>;
};

let overrides: PromptOverrides = {};

export function setPromptOverrides(next: PromptOverrides) {
  overrides = { ...overrides, ...next };
}

export function resetPromptOverrides() {
  overrides = {};
}

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

  return (pkg: NamedThing) =>
    overrides.confirm ? overrides.confirm(message, pkg) : loader.load(pkg);
}

async function promptForInput(
  message: string,
  pkg: { name: string },
  defaultAnswer?: string
): Promise<string> {
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
}

export let doPromptInput = (
  message: string,
  pkg: { name: string },
  defaultAnswer?: string
): Promise<string> =>
  overrides.input
    ? overrides.input(message, pkg, defaultAnswer)
    : promptForInput(message, pkg, defaultAnswer);

export let promptInput = (
  message: string,
  pkg: { name: string },
  defaultAnswer?: string
) => limit(() => doPromptInput(message, pkg, defaultAnswer));
