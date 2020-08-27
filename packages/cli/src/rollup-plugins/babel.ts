import * as babel from "@babel/core";
import { getWorker } from "../worker-client";
import { Plugin } from "rollup";
import initHasher from "xxhash-wasm";
import QuickLRU from "quick-lru";

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
    // @ts-ignore
    transform(code, filename) {
      if (
        typeof filename !== "string" ||
        fakeRollupModuleRegex.test(filename) ||
        !extensionRegex.test(filename) ||
        filename.includes("node_modules")
      ) {
        return Promise.resolve(null);
      }
      let hash = hasher(filename);
      if (lru.has(hash)) {
        let cachedResult = lru.get(hash)!;
        if (code === cachedResult.code) {
          return cachedResult.promise;
        }
      }
      let options = JSON.stringify({
        caller: {
          name: "rollup-plugin-babel",
          supportsStaticESM: true,
          supportsDynamicImport: true,
        },
        sourceMaps: true,
        cwd,
        filename,
      });
      let promise = getWorker()
        .transformBabel(code, options)
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
