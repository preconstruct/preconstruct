import * as babel from "@babel/core";
import { getWorker } from "../worker-client";
import { AcornNode, Plugin } from "rollup";
import QuickLRU from "quick-lru";

const lru = new QuickLRU<
  string,
  { code: string; promise: Promise<{ code: string; map: any; ast: AcornNode }> }
>({
  maxSize: 1000,
});

let extensionRegex = /\.[tj]sx?$/;

let fakeRollupModuleRegex = /\0/;

let externalHelpersCache = new Map<
  string,
  {
    ast: AcornNode;
    code: string;
  }
>();

let rollupPluginBabel = ({
  cwd,
  reportTransformedFile,
}: {
  cwd: string;
  reportTransformedFile: (filename: string) => void;
}): Plugin => {
  return {
    name: "babel",
    resolveId(id) {
      if (!id.startsWith("\0rollupPluginBabelHelpers/")) {
        return null;
      }
      return id;
    },

    load(id) {
      let helperName = id.replace(/\0rollupPluginBabelHelpers\//, "");
      if (helperName === id) {
        return null;
      }
      let helpersSourceDescription = externalHelpersCache.get(helperName);
      if (helpersSourceDescription === undefined) {
        let helpers = (babel as any).buildExternalHelpers(
          [helperName],
          "module"
        );
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
        fakeRollupModuleRegex.test(filename) ||
        !extensionRegex.test(filename) ||
        filename.includes("node_modules")
      ) {
        return null;
      }
      if (lru.has(filename)) {
        let cachedResult = lru.get(filename)!;
        if (code === cachedResult.code) {
          return cachedResult.promise.then((result) => {
            return {
              code: result.code,
              map: result.map,
              ast: JSON.parse(JSON.stringify(result.ast)),
            };
          });
        }
      }
      let promise = getWorker()
        .transformBabel(code, cwd, filename)
        .then((x) => {
          reportTransformedFile(filename);
          return {
            code: x.code,
            ast: this.parse(x.code!, undefined),
            map: x.map,
          };
        });
      lru.set(filename, { code, promise });
      return promise;
    },
  };
};

export default rollupPluginBabel;
