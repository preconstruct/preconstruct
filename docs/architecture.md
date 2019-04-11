# Architecture and Design Decisions

preconstruct is a heavily validation focussed build tool which enforces a number of restrictions on how it's used which enable certain powerful features.

## Random design questions you might have

### How does preconstruct know what to bundle in CJS and ESM bundles and what to make external?

Anything that is imported with a relative path is not marked as external and is be bundled.

preconstruct reads a given package's package.json and looks for the `dependencies` and `peerDependencies` fields and anything imports from packages in either `dependencies` or `peerDependencies` is marked as external. For imports to a package which isn't specified in `dependencies` or `peerDependencies`, an error is thrown prompting the user to add that package.

### How does preconstruct know what to bundle in UMD bundles and what to make external?

UMD bundles operate slightly differently to CJS and ESM bundles. Rather than marking `dependencies` and `peerDependencies` as external, only `peerDependencies` is marked as external. This difference exists so that changes to `dependencies` are not breaking changes for UMD users.

### Why are entrypoints and packages separate things? Couldn't they be the same thing and people could have more packages when they would have more entrypoints?

In two words, common dependencies.

Let's say we have module A, B and C. Module A and B are entrypoints and they both depend on C. You don't want module C to be duplicated in both A and B. Module C should be in it's own bundle which should be imported by modules A and B. Because of this, we need both packages and entrypoints so that preconstruct can know where package boundaries are and thus where to bundle.

> Note: This guarantee about modules not getting duplicated between entrypoints is not guaranteed for UMD builds.

### Why are the filenames of the dist files so strictly enforced?

Strictly enforcing the filenames allows preconstruct to automatically validate and fix any filenames to ensure that consumer bundlers will be able to consume the package.

### Why do all entrypoints in a package have to have the same build types?

This is necessary to guarantee that common dependencies between entrypoints in a package are not duplicated between entrypoints.
