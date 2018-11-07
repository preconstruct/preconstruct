// @flow
import chalk from "chalk";
import { Package } from "./package";

let preconstructEmoji = "🎁 ";

function suffix(pkg?: Package) {
  return pkg !== undefined ? ` ${pkg.name} ` : " ";
}

export function error(error: string, pkg?: Package) {
  console.error(preconstructEmoji + chalk.red("error") + suffix(pkg), error);
}

export function success(message: string, pkg?: Package) {
  console.log(
    preconstructEmoji + chalk.green("success") + suffix(pkg),
    message
  );
}

export function info(message: string, pkg?: Package) {
  console.log(preconstructEmoji + chalk.cyan("info") + suffix(pkg), message);
}
