import { FatalError, FixableError } from "./errors";
import resolveFrom from "resolve-from";
import chalk from "chalk";
import { errors } from "./messages";
import { Package } from "./package";
import { validFields } from "./utils";

let keys: <Obj>(obj: Obj) => (keyof Obj)[] = Object.keys;

export async function fixPackage(pkg: Package) {
  if (pkg.entrypoints.length === 0) {
    throw new FatalError(errors.noEntrypoints, pkg.name);
  }

  let modifiedPkg = false;

  if (pkg.project.experimentalFlags.nodeESM) {
    const valid = validFields.exports(pkg);
    if (JSON.stringify(pkg.json.exports) !== JSON.stringify(valid)) {
      pkg.json.exports = valid;
      modifiedPkg = await pkg.save();
    }
  }

  let fields = {
    main: true,
    module: pkg.entrypoints.some((x) => x.json.module !== undefined),
    "umd:main": pkg.entrypoints.some((x) => x.json["umd:main"] !== undefined),
    browser: pkg.entrypoints.some((x) => x.json.browser !== undefined),
  };

  keys(fields)
    .filter((x) => fields[x])
    .forEach((field) => {
      pkg.setFieldOnEntrypoints(field);
    });
  return (
    (await Promise.all(pkg.entrypoints.map((x) => x.save()))).some((x) => x) ||
    modifiedPkg
  );
}

let unsafeRequire = require;

export function validatePackage(pkg: Package) {
  if (pkg.entrypoints.length === 0) {
    throw new FatalError(errors.noEntrypoints, pkg.name);
  }

  if (pkg.project.experimentalFlags.nodeESM) {
    // using JSON.stringify(...) !== JSON.stringify(...) rather than fast-deep-equals bc order is important
    const valid = validFields.exports(pkg);
    if (JSON.stringify(pkg.json.exports) !== JSON.stringify(valid)) {
      throw new FixableError("exports field is incorrect", pkg.name);
    }
  }
  let fields = {
    // main is intentionally not here, since it's always required
    // it will be validated in validateEntrypoint and the case
    // which this function validates will never happen
    module: pkg.entrypoints[0].json.module !== undefined,
    "umd:main": pkg.entrypoints[0].json["umd:main"] !== undefined,
    browser: pkg.entrypoints[0].json.browser !== undefined,
  };

  pkg.entrypoints.forEach((entrypoint) => {
    keys(fields).forEach((field) => {
      if (entrypoint.json[field] && !fields[field]) {
        throw new FixableError(
          `${pkg.entrypoints[0].name} has a ${field} build but ${entrypoint.name} does not have a ${field} build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.`,
          pkg.name
        );
      }
      if (!entrypoint.json[field] && fields[field]) {
        throw new FixableError(
          `${entrypoint.name} has a ${field} build but ${pkg.entrypoints[0].name} does not have a ${field} build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.`,
          pkg.name
        );
      }
    });
  });

  // TODO: do this well
  if (fields["umd:main"]) {
    // this is a sorta naive check
    // but it's handling the most common case
    // i don't think it's worth implementing this well at this exact moment
    // because i'm guessing doing it well would cause more problems than it would solve
    // this will likely change in the future

    let sortaAllDeps = new Set([
      ...(pkg.json.peerDependencies
        ? Object.keys(pkg.json.peerDependencies)
        : []),
      ...(pkg.json.dependencies ? Object.keys(pkg.json.dependencies) : []),
    ]);

    for (let depName in pkg.json.dependencies) {
      let depPkgJson = unsafeRequire(
        resolveFrom(pkg.directory, depName + "/package.json")
      );
      if (depPkgJson.peerDependencies) {
        for (let pkgName in depPkgJson.peerDependencies) {
          if (!sortaAllDeps.has(pkgName)) {
            throw new FatalError(
              `the package ${chalk.blue(pkg.name)} depends on ${chalk.blue(
                depName
              )} which has a peerDependency on ${chalk.blue(
                pkgName
              )} but ${chalk.blue(
                pkgName
              )} is not specified in the dependencies or peerDependencies of ${chalk.blue(
                pkg.name
              )}. please add ${chalk.blue(
                pkgName
              )} to the dependencies or peerDependencies of ${chalk.blue(
                pkg.name
              )}`,
              pkg.name
            );
          }
        }
      }
    }
  }
}
