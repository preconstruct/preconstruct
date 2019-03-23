// @flow
import { FatalError } from "./errors";
/*:: 
import { Package } from "./package";
*/

let camelToPkgJsonField = {
  main: "main",
  module: "module",
  umdMain: "umd:main",
  browser: "browser",
  reactNative: "react-native"
};

export function validatePackage(pkg: Package) {
  if (pkg.entrypoints.length === 0) {
    throw new FatalError(
      "packages must have at least one entrypoint, this package has no entrypoints",
      pkg
    );
  }
  let fields = {
    main: true,
    module: !!pkg.entrypoints[0].module,
    umdMain: !!pkg.entrypoints[0].umdMain,
    browser: !!pkg.entrypoints[0].browser,
    reactNative: !!pkg.entrypoints[0].reactNative
  };

  pkg.entrypoints.forEach(entrypoint => {
    Object.keys(fields).forEach(field => {
      if (
        // $FlowFixMe
        entrypoint[field] &&
        !fields[field]
      ) {
        throw new FatalError(
          `${pkg.entrypoints[0].name} has a ${
            camelToPkgJsonField[field]
          } build but ${entrypoint.name} does not have a ${
            camelToPkgJsonField[field]
          } build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.`,
          pkg
        );
      }
      if (
        // $FlowFixMe
        !entrypoint[field] &&
        fields[field]
      ) {
        throw new FatalError(
          `${entrypoint.name} has a ${camelToPkgJsonField[field]} build but ${
            pkg.entrypoints[0].name
          } does not have a ${
            camelToPkgJsonField[field]
          } build. Entrypoints in a package must either all have a particular build type or all not have a particular build type.`,
          pkg
        );
      }
    });
  });
}
