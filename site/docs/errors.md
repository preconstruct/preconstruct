# Errors

Preconstruct includes many errors to help make sure your project will build correctly. If you find an error that's missing from this page or you think an error message could be improved, please open an issue!

## \* field is invalid {#-field-is-invalid}

This is Preconstruct saying that a field is not the value that it requires. Preconstruct requires that packages use certain values for the `main`, `module` and etc. fields to ensure that consumers will be able to consume them. It's important to note that all \* field is invalid errors can be auto-fixed by the `fix` command so please run `preconstruct fix` if you see this error.

## An unhandled Rollup error occurred: \* {#an-unhandled-rollup-error-occurred-}

This is an unhandled error from Rollup(the bundler Preconstruct uses) which could mean any number of things depending on the content. If you see this error, please [open an issue](https://github.com/preconstruct/preconstruct/issues/new) with the error so that we can provide a more useful error message.

## "{import}" is imported by "{path}" but the package is not specified in dependencies or peerDependencies {#import-is-imported-by-path-but-the-package-is-not-specified-in-dependencies-or-peerdependencies}

Preconstruct requires that all packages that are imported by a package be specified in dependencies or peerDependencies. This is to avoid the mistake of publishing a package that imports a package that isn't specified in its dependencies causing a consumer to be unable to use the package.

## all relative imports in a package should only import modules inside of their package directory but "{path}" is importing "{import}" {#all-relative-imports-in-a-package-should-only-import-modules-inside-of-their-package-directory-but-path-is-importing-import}

Preconstruct requires that all imports in a package must either packages that are specified as `dependencies` or `peerDependencies` or modules inside of a package's directory. This is so that Preconstruct can know that all source files are in the package directory which is necessary to know for the way Preconstruct does TypeScript declaration generation and because when you do this, it is generally a mistake.

## {entrypoint-name-a} has a {field-name} build but {entrypoint-name-b} does not have a {field-name} build. Entrypoints in a package must either all have a particular build type or all not have a particular build type. {#entrypoint-name-a-has-a-field-name-build-but-entrypoint-name-b-does-not-have-a-field-name-build-entrypoints-in-a-package-must-either-all-have-a-particular-build-type-or-all-not-have-a-particular-build-type}

Preconstruct requires that all entrypoints in a package have the same fields so that it can guarantee that common modules between entrypoints will never be instantiated twice within an environment.

## '{export-a}' is not exported by {module-a}, imported by {module-b} {#export-a-is-not-exported-by-module-a-imported-by-module-b}

If you are building a TypeScript package, chances are you're re-exporting a type in a way that's not compatible with `@babel/preset-typescript`. See [Building TypeScript packages](/guides/building-typescript-packages) for more information. To fix it, you should use [type-only imports and exports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)

## EPERM: operation not permitted, symlink {file.ts} -> {file.js} {#operation-not-permitted-symlink}

If you're on Windows, you need to [enable Developer Mode](/guides/using-preconstruct-dev-in-a-monorepo#windows-developer-mode) for `preconstruct dev` to work on Windows.
