import * as babel from "@babel/core";
import path from "path";
import crypto from "crypto";
import resolveFrom from "resolve-from";
import fs from "fs-extra";
import { importHelperPlugin } from "./babel-import-helper-plugin";
import { GeneratorResult } from "@babel/generator";
import { getWorker } from "./worker-client";

function normalizeOptions(config: {
  options: any;
  passes: any;
}): babel.TransformOptions & {
  parserOpts: babel.ParserOptions;
  generatorOpts: babel.GeneratorOptions;
} {
  const {
    filename,
    cwd,
    filenameRelative = typeof filename === "string"
      ? path.relative(cwd, filename)
      : "unknown",
    sourceType = "module",
    inputSourceMap,
    sourceMaps = !!inputSourceMap,

    moduleRoot,
    sourceRoot = moduleRoot,

    sourceFileName = path.basename(filenameRelative),

    comments = true,
  } = config.options;

  const opts = config.options;

  const options = {
    ...opts,

    parserOpts: {
      sourceType:
        path.extname(filenameRelative) === ".mjs" ? "module" : sourceType,

      sourceFileName: filename,
      plugins: [],
      ...opts.parserOpts,
    },

    generatorOpts: {
      // General generator flags.
      filename,
      comments,
      shouldPrintComment: opts.shouldPrintComment,
      // Source-map generation flags.
      sourceMaps,

      sourceRoot,
      sourceFileName,
      ...opts.generatorOpts,
    },
  };

  for (const plugins of config.passes) {
    for (const plugin of plugins) {
      if (plugin.manipulateOptions) {
        plugin.manipulateOptions(options, options.parserOpts);
      }
    }
  }

  return options;
}

export function hashString(input: string) {
  let md5sum = crypto.createHash("md5");
  md5sum.update(input);
  return md5sum.digest("hex");
}

const babelCoreLocation = require.resolve("@babel/core");

const babelParserVersion = require(resolveFrom(
  babelCoreLocation,
  "@babel/parser/package.json"
)).version;

const babelGeneratorVersion = require(resolveFrom(
  babelCoreLocation,
  "@babel/parser/package.json"
)).version;

function resolveOptions(inputOptions: babel.TransformOptions) {
  let options = babel.loadOptions(inputOptions) as any;

  if (!options) return null;

  const normalized = normalizeOptions({
    options,
    passes: [options.plugins, ...options.presets],
  });

  const parseCacheKey = hashString(
    JSON.stringify({
      parserOpts: normalized.parserOpts,
      babelParserVersion,
    })
  );

  const generatorCacheKey = hashString(
    JSON.stringify({
      generatorOpts: normalized.generatorOpts,
      babelGeneratorVersion,
    })
  );
  return {
    parseCacheKey,
    generatorCacheKey,
    options: normalized,
  };
}

export async function cachedTransformBabel(
  code: string,
  cwd: string,
  filename: string
) {
  const worker = getWorker();
  const { generatorCacheKey, parseCacheKey, options } = resolveOptions({
    caller: {
      name: "rollup-plugin-babel",
      supportsStaticESM: true,
      supportsDynamicImport: true,
    },
    sourceMaps: true,
    // @ts-ignore
    inputSourceMap: false,
    cwd,
    filename,
    plugins: [importHelperPlugin],
  })!;
  let cachedAST: {
    parse?: { ast: babel.types.File; cacheKey: string };
    generator?: {
      cacheKey: string;
      code: string;
      map: GeneratorResult["map"];
    };
  } = {};
  const cacheFilename = path.join(
    cwd,
    "node_modules",
    ".cache",
    "preconstruct",
    "babel",
    `${hashString(path.relative(cwd, filename))}.json`
  );
  try {
    cachedAST = await fs.readJson(cacheFilename);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const originalParseCacheKey = cachedAST.parse?.cacheKey;
  const originalGeneratorCacheKey = cachedAST.generator?.cacheKey;

  const finalParseCacheKey = hashString(parseCacheKey + ":" + code);
  if (cachedAST.parse?.cacheKey !== finalParseCacheKey) {
    cachedAST.parse = {
      ast: await worker.babelParse(code, options.parserOpts),
      cacheKey: finalParseCacheKey,
    };
  }
  const res = babel.transformFromAstSync(cachedAST.parse.ast, code, {
    ...options,
    // @ts-ignore
    cloneInputAst: false,
    code: false,
    ast: true,
  });
  const finalGenerateCacheKey = hashString(
    generatorCacheKey + ":" + JSON.stringify(res!.ast)
  );

  if (cachedAST.generator?.cacheKey !== finalGenerateCacheKey) {
    const generated = await worker.babelGenerate(
      res!.ast!,
      options.generatorOpts
    );

    cachedAST.generator = {
      cacheKey: finalGenerateCacheKey,
      code: generated.code,
      map: generated.map,
    };
  }
  if (
    originalParseCacheKey !== finalParseCacheKey ||
    originalGeneratorCacheKey !== finalGenerateCacheKey
  ) {
    await fs.outputJSON(cacheFilename, cachedAST);
  }
  return {
    code: cachedAST.generator.code,
    map: cachedAST.generator.map,
  };
}
