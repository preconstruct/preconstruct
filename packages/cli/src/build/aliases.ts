import { Project } from "../project";

export type Aliases = {
  [key: string]: string;
};

export function getAliases(project: Project): Aliases {
  let aliases: { [key: string]: string } = {};
  project.packages.forEach((pkg) => {
    pkg.entrypoints.forEach((entrypoint) => {
      aliases[entrypoint.name] = entrypoint.source;
    });
  });
  return aliases;
}
