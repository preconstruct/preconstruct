import { Package } from "../package";
import { FatalError } from "../errors";
import { Plugin } from "rollup";
import normalizePath from "normalize-path";
import path from "path";

const allowedExtensionRegex = /\.([tj]sx?|json)$/;

export function resolveErrorsPlugin(
  pkg: Package,
  warnings: Set<string>,
  isUmd: boolean
): Plugin {
  return {
    name: "resolve-errors",
    async resolveId(source, importer) {
      let resolved = await this.resolve(source, importer, {
        skipSelf: true,
      });
      if (resolved === null) {
        if (!source.startsWith(".")) {
          warnings.add(
            `"${source}" is imported ${
              importer
                ? `by "${normalizePath(
                    path.relative(pkg.directory, importer!)
                  )}"`
                : ""
            } but the package is not specified in dependencies or peerDependencies`
          );
          return false;
        }
        throw new FatalError(
          `Could not resolve ${source} ` +
            (importer ? `from ${path.relative(pkg.directory, importer)}` : ""),
          pkg.name
        );
      }

      if (source.startsWith("\0") || resolved.id.startsWith("\0")) {
        return resolved;
      }
      if (resolved.id.startsWith(pkg.directory)) {
        if (!resolved.external && !allowedExtensionRegex.test(resolved.id)) {
          warnings.add(
            `only .ts, .tsx, .js, .jsx, and .json files can be imported but "${
              importer === undefined
                ? source
                : normalizePath(path.relative(path.dirname(importer), source))
            }" is imported in ${
              importer
                ? `"${normalizePath(path.relative(pkg.directory, importer))}"`
                : "a module"
            }`
          );
          return false;
        }

        return resolved;
      }
      if (isUmd) return resolved;
      if (resolved.id !== source) {
        warnings.add(
          `all relative imports in a package should only import modules inside of their package directory but ${
            importer
              ? `"${normalizePath(path.relative(pkg.directory, importer))}"`
              : "a module"
          } is importing "${source}"`
        );
      }

      return false;
    },
  };
}
