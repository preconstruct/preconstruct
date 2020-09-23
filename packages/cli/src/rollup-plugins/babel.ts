import * as babel from "@babel/core";
import { getWorker } from "../worker-client";
import { Plugin } from "rollup";
import initHasher from "xxhash-wasm";
import QuickLRU from "quick-lru";
import { HELPERS } from "../constants";

const lru = new QuickLRU<
  string,
  { code: string; promise: Promise<{ code: string; map: any }> }
>({
  maxSize: 1000,
});

let hasher: (str: string) => string;

export let hasherPromise = initHasher().then(({ h64 }: any) => {
  hasher = h64;
});

let extensionRegex = /\.[tj]sx?$/;

let fakeRollupModuleRegex = /\0/;

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
      if (id !== HELPERS) {
        return null;
      }
      return id;
    },

    load(id) {
      if (id !== HELPERS) {
        return null;
      }
      return (babel as any).buildExternalHelpers(null, "module");
    },
    // @ts-ignore
    transform(code, filename) {
      if (
        filename === HELPERS ||
        typeof filename !== "string" ||
        fakeRollupModuleRegex.test(filename) ||
        !extensionRegex.test(filename) ||
        filename.includes("node_modules")
      ) {
        return null;
      }
      let hash = hasher(filename);
      if (lru.has(hash)) {
        let cachedResult = lru.get(hash)!;
        if (code === cachedResult.code) {
          return cachedResult.promise;
        }
      }
      let promise = getWorker()
        .transformBabel(code, cwd, filename)
        .then((x) => {
          reportTransformedFile(filename);
          return x;
        });
      // @ts-ignore
      lru.set(hash, { code, promise });
      return promise;
    },
  };
};

export default rollupPluginBabel;
