import { lazyRequire } from "lazy-require.macro";
import * as babel from "@babel/core";
import resolveFrom from "resolve-from";
import { importHelperPlugin } from "./babel-import-helper-plugin";

export async function transformBabel(
  code: string,
  cwd: string,
  filename: string
) {
  const babel = lazyRequire<typeof import("@babel/core")>();

  return babel
    .transformAsync(code, {
      caller: {
        name: "rollup-plugin-babel",
        supportsStaticESM: true,
        supportsDynamicImport: true,
      },
      sourceMaps: true,
      cwd,
      filename,
      plugins: [importHelperPlugin],
    })
    .then((res) => {
      return { code: res!.code!, map: res!.map };
    });
}

const babelParser: typeof import("@babel/parser") = require(resolveFrom(
  require.resolve("@babel/core"),
  "@babel/parser"
));

const babelGenerator: typeof import("@babel/generator") = require(resolveFrom(
  require.resolve("@babel/core"),
  "@babel/generator"
));

export const babelParse = babelParser.parse;

export function babelGenerate(
  ast: babel.types.Node,
  opts: babel.GeneratorOptions
) {
  const { code, map } = babelGenerator.default(ast, opts);
  return { code, map };
}

export function transformTerser(code: string, optionsString: string) {
  const { minify } = lazyRequire<typeof import("terser")>();
  const options = JSON.parse(optionsString);
  return minify(code, options) as Promise<{ code: string; map: any }>;
}
