// @flow
import chalk from "chalk";
import { Package } from "./package";
import { Entrypoint } from "./entrypoint";

let preconstructEmoji = "🎁 ";

type Item = Package | Entrypoint; // | Project in the future

function suffix(item?: Package | Entrypoint) {
  if (pkg === undefined) {
    return;
  }
  let isEntrypointSameAsPackage = pkg.directory === entrypoint.directory;

  let str = pkg !== undefined ? ` ${pkg.name}` : "";
  if (!isEntrypointSameAsPackage) {
    str += ` at entrypoint ${pkg.directory}`;
  }
  return str;
}

export function error(error: string, pkg?: Package, entrypoint?: Entrypoint) {
  console.error(
    preconstructEmoji + chalk.red("error") + suffix(pkg, entrypoint),
    error
  );
}

export function success(
  message: string,
  pkg?: Package,
  entrypoint?: Entrypoint
) {
  console.log(
    preconstructEmoji + chalk.green("success") + suffix(pkg, entrypoint),
    message
  );
}

export function info(message: string, pkg?: Package, entrypoint?: Entrypoint) {
  console.log(
    preconstructEmoji + chalk.cyan("info") + suffix(pkg, entrypoint),
    message
  );
}
