import path from "path";
import chalk from "chalk";
import * as fs from "fs-extra";
import packlist from "npm-packlist";
import { Package } from "./package";
import { FatalError } from "./errors";

export async function validateIncludedFiles(pkg: Package) {
  try {
    await Promise.all(
      pkg.entrypoints.map(async (entrypoint) => {
        let filename = path.join(
          entrypoint.directory,
          "dist",
          "preconstruct-test-file"
        );
        await fs.ensureFile(filename);
        return fs.writeFile(filename, "test content");
      })
    );

    let result = await packlist({ path: pkg.directory });

    // Ensure consistent path separators. Without this, there's a mismatch between this result and the path it
    // checks on Windows. This value will have a forward slash (dist/preconstruct-test-file), whereas the value
    // of distFilePath below will have a backslash (dist\preconstruct-test-file). Obviously these two won't match,
    // so the distfile check will fail.
    result = result.map((p) => path.normalize(p));

    // check that we're including the package.json and main file
    // TODO: add Flow and TS check and if they're ignored, don't write them
    let messages: string[] = [];
    pkg.entrypoints.forEach((entrypoint) => {
      let pkgJsonPath = path.relative(
        pkg.directory,
        path.resolve(entrypoint.directory, "package.json")
      );
      let distFilePath = path.relative(
        pkg.directory,
        path.resolve(entrypoint.directory, "dist", "preconstruct-test-file")
      );
      let entrypointName = path.relative(pkg.directory, entrypoint.directory);
      if (!result.includes(pkgJsonPath)) {
        messages.push(
          `the entrypoint ${chalk.cyan(
            entrypointName
          )} isn't included in the published files for this package, please add it to the files field in the package's package.json`
        );
      } else if (!result.includes(distFilePath)) {
        messages.push(
          `the dist directory ${
            entrypointName === ""
              ? ""
              : `for entrypoint ${chalk.cyan(entrypointName)} `
          }isn't included in the published files for this package, please add it to the files field in the package's package.json`
        );
      }
    });
    if (messages.length) {
      throw new FatalError(messages.join("\n"), pkg.name);
    }
  } finally {
    await Promise.all(
      pkg.entrypoints.map((entrypoint) =>
        fs.remove(
          path.join(entrypoint.directory, "dist", "preconstruct-test-file")
        )
      )
    );
  }
}
