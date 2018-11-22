// @flow
import { Package } from "../package";
import * as logger from "../logger";
import { getAliases } from "./aliases";
import Worker from "jest-worker";

export default async function build(directory: string) {
  let pkg = await Package.create(directory);
  // do more stuff with checking whether the repo is using yarn workspaces or bolt

  let packages = await pkg.packages();
  let worker = new Worker(require.resolve("./build-worker"));
  if (packages === null) {
    let strictPackage = pkg.strict();
    await worker.build(strictPackage.directory, JSON.stringify({}));
  } else {
    let strictPackages = packages.map(x => x.strict());
    let aliases = JSON.stringify(getAliases(strictPackages));
    await Promise.all(
      strictPackages.map(pkg => worker.build(pkg.directory, aliases))
    );
  }
  worker.end();
  logger.success("built bundles!");
}
