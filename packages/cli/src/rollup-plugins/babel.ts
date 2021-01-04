import { getWorker } from "../worker-client";
import { AcornNode, Plugin } from "rollup";
import QuickLRU from "quick-lru";
import resolveFrom from "resolve-from";
import semver from "semver";

const lru = new QuickLRU<
  string,
  { code: string; promise: Promise<{ code: string; map: any; ast: AcornNode }> }
>({
  maxSize: 1000,
});

let extensionRegex = /\.[tj]sx?$/;

let externalHelpersCache = new Map<
  string,
  {
    ast: AcornNode;
    code: string;
  }
>();

const resolvedBabelCore = require.resolve("@babel/core");

const babelHelpers: typeof import("@babel/helpers") = require(resolveFrom(
  resolvedBabelCore,
  "@babel/helpers"
));

const babelGenerator: typeof import("@babel/generator") = require(resolveFrom(
  resolvedBabelCore,
  "@babel/generator"
));

const babelHelpersModuleStart = "\0rollupPluginBabelHelpers/";

// from https://github.com/babel/babel/blob/9808d2566e6a2b2d9e4c7890d8efbc9af180c683/packages/babel-core/src/transformation/file/file.js#L129-L164
// the main difference being that it uses a newer version of semver
// because the version of semver that @babel/core uses fails on semver.intersects calls with "*"
function babelRuntimeVersionRangeHasHelper(
  name: string,
  versionRange: string
): boolean {
  // babel's version has a try catch around this to handle unknown helpers
  // but if we're in here, we know that this version of @babel/helpers
  // understands the helper that we're getting the minVersion of
  let minVersion = babelHelpers.minVersion(name);
  return (
    !semver.intersects(`<${minVersion}`, versionRange) &&
    !semver.intersects(`>=8.0.0`, versionRange)
  );
}

let rollupPluginBabel = ({
  cwd,
  reportTransformedFile,
  babelRuntime,
}: {
  cwd: string;
  // TODO: maybe support corejs ones as well?
  babelRuntime: { range: string; name: string } | undefined;
  reportTransformedFile: (filename: string) => void;
}): Plugin => {
  // semver.intersects() has some surprising behavior with comparing ranges
  // with pre-release versions. We add '^' to ensure that we are always
  // comparing ranges with ranges, which sidesteps this logic.
  // For example:
  //
  //   semver.intersects(`<7.0.1`, "7.0.0-beta.0") // false - surprising
  //   semver.intersects(`<7.0.1`, "^7.0.0-beta.0") // true - expected
  //
  // This is because the first falls back to
  //
  //   semver.satisfies("7.0.0-beta.0", `<7.0.1`) // false - surprising
  //
  // and this fails because a prerelease version can only satisfy a range
  // if it is a prerelease within the same major/minor/patch range.
  //
  // Note: If this is found to have issues, please also revisit the logic in
  // transform-runtime's definitions.js file.
  const babelRuntimeVersion = semver.valid(babelRuntime?.range)
    ? `^${babelRuntime?.range}`
    : babelRuntime?.range;
  const resolveIdForBabelHelper =
    babelRuntimeVersion === undefined ||
    babelRuntime === undefined ||
    !semver.validRange(babelRuntimeVersion)
      ? (helper: string) => `${babelHelpersModuleStart}${helper}`
      : (helper: string) => {
          if (babelRuntimeVersionRangeHasHelper(helper, babelRuntimeVersion)) {
            return `${babelRuntime.name}/helpers/${helper}`;
          }
          return `${babelHelpersModuleStart}${helper}`;
        };
  return {
    name: "babel",
    resolveId(id, parent) {
      const currentIsBabelHelper = id.startsWith(babelHelpersModuleStart);
      if (!currentIsBabelHelper) {
        if (parent && parent.startsWith(babelHelpersModuleStart)) {
          return resolveIdForBabelHelper(id);
        }
        return null;
      }
      return resolveIdForBabelHelper(id.slice(babelHelpersModuleStart.length));
    },

    load(id) {
      let helperName = id.replace(/\0rollupPluginBabelHelpers\//, "");
      if (helperName === id) {
        return null;
      }
      let helpersSourceDescription = externalHelpersCache.get(helperName);
      if (helpersSourceDescription === undefined) {
        const helperNodes = babelHelpers.get(helperName).nodes;

        let helpers = babelGenerator.default(
          // @ts-ignore
          {
            type: "Program",
            body: helperNodes,
          }
        ).code;

        helpersSourceDescription = {
          ast: this.parse(helpers, undefined),
          code: helpers,
        };
        externalHelpersCache.set(helperName, helpersSourceDescription);
      }
      return helpersSourceDescription;
    },
    transform(code, filename) {
      if (
        typeof filename !== "string" ||
        filename[0] === "\0" ||
        !extensionRegex.test(filename) ||
        filename.includes("node_modules")
      ) {
        return null;
      }
      if (lru.has(filename)) {
        let cachedResult = lru.get(filename)!;
        if (code === cachedResult.code) {
          return cachedResult.promise.then((result) => {
            const ast = JSON.parse(JSON.stringify(result.ast));
            return {
              code: result.code,
              map: result.map,
              ast,
              meta: {
                babel: { ast },
              },
            };
          });
        }
      }
      let promise = getWorker()
        .transformBabel(code, cwd, filename)
        .then((x) => {
          reportTransformedFile(filename);
          const ast = this.parse(x.code!, undefined);
          return {
            code: x.code,
            ast: this.parse(x.code!, undefined),
            map: x.map,
            meta: {
              babel: { ast },
            },
          };
        });
      lru.set(filename, { code, promise });
      return promise;
    },
  };
};

export default rollupPluginBabel;
