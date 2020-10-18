import { lazyRequire } from "lazy-require.macro";
// @ts-ignore
import { addDefault } from "@babel/helper-module-imports";
import * as babel from "@babel/core";
import { hashString, resolveOptions } from "./babel-stuff";
import resolveFrom from "resolve-from";
import * as fs from "fs-extra";
import path from "path";

function importHelperPlugin(babel: typeof import("@babel/core")) {
  return {
    pre(file: any) {
      const cachedHelpers: Record<string, babel.types.Identifier> = {};
      const previousHelperGenerator = file.get("helperGenerator");
      file.set("helperGenerator", (name: string) => {
        if (previousHelperGenerator) {
          const helperFromPrev = previousHelperGenerator(name);
          if (helperFromPrev != null) return helperFromPrev;
        }
        if (!file.availableHelper(name)) {
          return null;
        }

        if (cachedHelpers[name]) {
          return babel.types.identifier(cachedHelpers[name].name);
        }

        return (cachedHelpers[name] = addDefault(
          file.path,
          `\0rollupPluginBabelHelpers/${name}`
        ));
      });
    },
  };
}

const babelParser: typeof import("@babel/parser") = require(resolveFrom(
  require.resolve("@babel/core"),
  "@babel/parser"
));

const babelGenerator: typeof import("@babel/generator") = require(resolveFrom(
  require.resolve("@babel/core"),
  "@babel/generator"
));

export async function transformBabel(
  code: string,
  cwd: string,
  filename: string
) {
  const { generatorCacheKey,parseCacheKey, options } = resolveOptions({
    caller: {
      name: "rollup-plugin-babel",
      supportsStaticESM: true,
      supportsDynamicImport: true,
    },
    sourceMaps: true,
    cwd,
    filename,
    plugins: [importHelperPlugin],
  })!;
  let cachedAST;
  const cacheFilename = path.join(
    cwd,
    "node_modules",
    ".cache",
    "preconstruct",
    `${hashString(path.relative(cwd, filename))}.json`
  );
  try {
    cachedAST = await fs.readJson(cacheFilename);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const finalCacheKey = hashString(parseCacheKey + ":" + code);
  if (!cachedAST || cachedAST.cacheKey !== finalCacheKey) {
    console.log("parse");
    cachedAST = {
      parse: {
        ast: babelParser.parse(code, options.parserOpts),
        cacheKey: finalCacheKey,
      },
      generate: {
        result: ,
        cacheKey: finalCacheKey,
      },
    };
    await fs.outputJSON(cacheFilename, cachedAST);
  }

  const res = babel.transformFromAstSync(cachedAST.ast, code, {
    ...options,
    // @ts-ignore
    cloneInputAst: false,
    code: false,
    ast: true,
  });
  const output = babelGenerator.default(res!.ast!, options.generatorOpts);
  return {
    code: output.code,
    map: output.map,
  };
}

export function transformTerser(code: string, optionsString: string) {
  const { minify } = lazyRequire<typeof import("terser")>();
  const options = JSON.parse(optionsString);
  return minify(code, options) as Promise<{ code: string; map: any }>;
}
