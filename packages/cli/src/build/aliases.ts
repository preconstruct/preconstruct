import { Project } from "../project";
import path from "upath";

export type Aliases = {
  [key: string]: string;
};

export function getAliases(project: Project): Aliases {
  let aliases: { [key: string]: string } = {};
  project.packages.forEach(pkg => {
    pkg.entrypoints
      .map(x => x.strict())
      .forEach(entrypoint => {
        aliases[entrypoint.name] = path.join(
          pkg.name,
          path.relative(entrypoint.directory, entrypoint.source)
        );
      });
  });
  return aliases;
}
