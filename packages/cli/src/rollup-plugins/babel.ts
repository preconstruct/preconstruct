import * as babel from "@babel/core";
import { createFilter } from "rollup-pluginutils";
import { getWorker } from "../worker-client";
import { Plugin } from "rollup";
// @ts-ignore
import initHasher from "xxhash-wasm";
import QuickLRU from "quick-lru";

const regExpCharactersRegExp = /[\\^$.*+?()[\]{}|]/g;
const escapeRegExpCharacters = (str: string) =>
  str.replace(regExpCharactersRegExp, "\\$&");

const unpackOptions = ({
  // @ts-ignore
  extensions = babel.DEFAULT_EXTENSIONS,
  // rollup uses sourcemap, babel uses sourceMaps
  // just normalize them here so people don't have to worry about it
  sourcemap = true,
  sourcemaps = true,
  sourceMap = true,
  sourceMaps = true,
  ...rest
}: any = {}) => ({
  extensions,
  plugins: [],
  sourceMaps: sourcemap && sourcemaps && sourceMap && sourceMaps,
  ...rest,
  caller: {
    name: "rollup-plugin-babel",
    supportsStaticESM: true,
    supportsDynamicImport: true,
    ...rest.caller
  }
});

const lru = new QuickLRU<
  string,
  { code: string; promise: Promise<{ code: string; map: any }> }
>({
  maxSize: 1000
});

let hasher: (str: string) => string;

export let hasherPromise = initHasher().then(({ h64 }: any) => {
  hasher = h64;
});

let rollupPluginBabel = (pluginOptions: any): Plugin => {
  const { exclude, extensions, include, ...babelOptions } = unpackOptions(
    pluginOptions
  );

  const extensionRegExp = new RegExp(
    `(${extensions.map(escapeRegExpCharacters).join("|")})$`
  );
  const includeExcludeFilter = createFilter(include, exclude);
  const filter = (id: string) =>
    extensionRegExp.test(id) && includeExcludeFilter(id);

  return {
    name: "babel",
    // @ts-ignore
    transform(code, filename) {
      if (!filter(filename)) return Promise.resolve(null);
      let hash = hasher(filename);
      if (lru.has(hash)) {
        let cachedResult = lru.get(hash)!;
        if (code === cachedResult.code) {
          return cachedResult.promise;
        }
      }
      let options = JSON.stringify({ ...babelOptions, filename });
      let promise = getWorker().transformBabel(code, options);
      // @ts-ignore
      lru.set(hash, { code, promise });
      return promise;
    }
  };
};

export default rollupPluginBabel;
