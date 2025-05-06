import path from "path";
import chalk from "chalk";
import fs from "node:fs/promises";
import packlist from "npm-packlist";
import { Package } from "./package";
import { FatalError } from "./errors";
import { fsOutputFile } from "./utils";

export async function validateIncludedFiles(pkg: Package) {
  try {
    const rootDistDirectoryTestFilepath = path.join(
      pkg.directory,
      "dist",
      "preconstruct-test-file"
    );
    const hasNoEntrypointAtRootOfPackage = pkg.entrypoints.every(
      (entrypoint) => entrypoint.directory !== pkg.directory
    );
    await Promise.all(
      pkg.entrypoints
        .map(async (entrypoint) => {
          if (pkg.isTypeModule() && entrypoint.name !== pkg.name) return;
          let filename = path.join(
            entrypoint.directory,
            "dist",
            "preconstruct-test-file"
          );
          return fsOutputFile(filename, "test content");
        })
        .concat(
          hasNoEntrypointAtRootOfPackage
            ? fsOutputFile(rootDistDirectoryTestFilepath, "test content")
            : []
        )
    );

    let packedFilesArr = await packlist({ path: pkg.directory });

    // Ensure consistent path separators. Without this, there's a mismatch between this result and the path it
    // checks on Windows. This value will have a forward slash (dist/preconstruct-test-file), whereas the value
    // of distFilePath below will have a backslash (dist\preconstruct-test-file). Obviously these two won't match,
    // so the distfile check will fail.
    let result = new Set(packedFilesArr.map((p) => path.normalize(p)));

    // check that we're including the package.json and main file
    // TODO: add Flow and TS check and if they're ignored, don't write them
    let messages: string[] = [];
    pkg.entrypoints.forEach((entrypoint) => {
      if (pkg.isTypeModule() && entrypoint.name !== pkg.name) return;
      let pkgJsonPath = path.relative(
        pkg.directory,
        path.resolve(entrypoint.directory, "package.json")
      );
      let distFilePath = path.relative(
        pkg.directory,
        path.resolve(entrypoint.directory, "dist", "preconstruct-test-file")
      );
      let entrypointName = path.relative(pkg.directory, entrypoint.directory);
      if (!result.has(pkgJsonPath)) {
        messages.push(
          `the entrypoint ${chalk.cyan(
            entrypointName
          )} isn't included in the published files for this package, please add it to the files field in the package's package.json`
        );
      } else if (!result.has(distFilePath)) {
        messages.push(
          `the dist directory ${
            entrypointName === ""
              ? ""
              : `for entrypoint ${chalk.cyan(entrypointName)} `
          }isn't included in the published files for this package, please add it to the files field in the package's package.json`
        );
      }
    });
    if (
      hasNoEntrypointAtRootOfPackage &&
      !result.has(path.relative(pkg.directory, rootDistDirectoryTestFilepath))
    ) {
      messages.push(
        "the dist directory in the root of the package isn't included in the published files for this package, please add it to the files field in the package's package.json.\nthough this package does not have an entrypoint at the root of the package, preconstruct will write common chunks to the root dist directory so it must be included."
      );
    }
    if (messages.length) {
      throw new FatalError(messages.join("\n"), pkg.name);
    }
  } finally {
    await Promise.all(
      pkg.entrypoints.map((entrypoint) =>
        fs.rm(
          path.join(entrypoint.directory, "dist", "preconstruct-test-file"),
          { recursive: true, force: true }
        )
      )
    );
  }
}
