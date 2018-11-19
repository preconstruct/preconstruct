// @flow
import { retryableBuild } from "./build-package";
import { Package } from "../package";

export async function build(pkgPath: string, aliases: string) {
  let parsedAliases: { [key: string]: string } = JSON.parse(aliases);
  let pkg = await Package.create(pkgPath);
  pkg = pkg.strict();

  await retryableBuild(pkg, parsedAliases);
}
