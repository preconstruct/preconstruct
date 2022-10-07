import { FatalError, FixableError } from "./errors";
import resolveFrom from "resolve-from";
import chalk from "chalk";
import { errors } from "./messages";
import { Package } from "./package";
import { isFieldValid } from "./validate";
import { setFieldInOrder, exportsField } from "./utils";

let keys: <Obj>(obj: Obj) => (keyof Obj)[] = Object.keys;

export async function fixPackage(pkg: Package) {
  if (pkg.entrypoints.length === 0) {
    throw new FatalError(errors.noEntrypoints, pkg.name);
  }

  const exportsFieldConfig = pkg.exportsFieldConfig();

  let fields = {
    main: true,
    module:
      pkg.entrypoints.some((x) => x.json.module !== undefined) ||
      !!exportsFieldConfig,
    "umd:main": pkg.entrypoints.some((x) => x.json["umd:main"] !== undefined),
    browser: pkg.entrypoints.some((x) => x.json.browser !== undefined),
  };

  if (exportsFieldConfig) {
    if (fields.browser || exportsFieldConfig.envConditions.has("browser")) {
      if (typeof pkg.json.preconstruct.exports !== "object") {
        pkg.json.preconstruct.exports = {};
      }
      if (!pkg.json.preconstruct.exports.envConditions) {
        pkg.json.preconstruct.exports.envConditions = [];
      }
      if (!pkg.json.preconstruct.exports.envConditions.includes("browser")) {
        pkg.json.preconstruct.exports.envConditions.push("browser");
      }
      fields.browser = true;
    }
  }

  keys(fields)
    .filter((x) => fields[x])
    .forEach((field) => {
      pkg.setFieldOnEntrypoints(field);
    });

  pkg.json = setFieldInOrder(pkg.json, "exports", exportsField(pkg));

  // Remove any `module` fields if package `type` is `"module"`
  if (pkg.type === "module" && fields.module) {
    pkg.json = setFieldInOrder(pkg.json, "module", undefined);
  }

  await pkg.save();

  return (await Promise.all(pkg.entrypoints.map((x) => x.save()))).some(
    (x) => x
  );
}

let unsafeRequire = require;

export function validatePackage(pkg: Package) {
  if (pkg.entrypoints.length === 0) {
    throw new FatalError(errors.noEntrypoints, pkg.name);
  }

  let fields = {
    // main is intentionally not here, since it's always required
    // it will be validated in validateEntrypoint and the case
    // which this function validates will never happen
    module: pkg.entrypoints[0].json.module !== undefined,
    "umd:main": pkg.entrypoints[0].json["umd:main"] !== undefined,
    browser: pkg.entrypoints[0].json.browser !== undefined,
    // "exports" is not here because it is not like these fields, it exists on a package, not an entrypoint
  };

  const exportsFieldConfig = pkg.exportsFieldConfig();

  if (exportsFieldConfig) {
    if (!fields.module && pkg.type !== "module") {
      throw new FixableError(errors.noModuleFieldWithExportsField, pkg.name);
    }
    const hasField = fields.browser;
    const hasCondition = exportsFieldConfig.envConditions.has("browser");
    if (hasField && !hasCondition) {
      throw new FixableError(
        errors.missingBrowserConditionWithFieldPresent,
        pkg.name
      );
    }
    if (!hasField && hasCondition) {
      throw new FixableError(
        errors.missingBrowserFieldWithConditionPresent,
        pkg.name
      );
    }
  }

  if (!isFieldValid.exports(pkg)) {
    throw new FixableError(
      errors.invalidField("exports", pkg.json.exports, exportsField(pkg)),
      pkg.name
    );
  }

  pkg.entrypoints.forEach((entrypoint) => {
    keys(fields).forEach((field) => {
      if (entrypoint.json[field] && !fields[field]) {
        throw new FixableError(
          `${entrypoint.name} has a ${field} build but ${pkg.entrypoints[0].name} does not have a ${field} build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.`,
          pkg.name
        );
      }
      if (!entrypoint.json[field] && fields[field]) {
        throw new FixableError(
          `${pkg.entrypoints[0].name} has a ${field} build but ${entrypoint.name} does not have a ${field} build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.`,
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
      let depPkgJson: any;
      try {
        depPkgJson = unsafeRequire(
          resolveFrom(pkg.directory, depName + "/package.json")
        );
      } catch (err) {
        // ideally we'd resolve the packages ignoring the exports field but emitting
        // the peer dependency error thing below isn't that important
        // and having this be not broken for now is better
        if (err.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
          continue;
        }
        throw err;
      }
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
