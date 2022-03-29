"use strict";

const hookLoader = require.resolve("./hook-loader");

module.exports = (nextConfig = {}) => {
  let originalWebpack = nextConfig.webpack;

  nextConfig.webpack = (webpackConfig, options) => {
    let hasFoundRule = false;
    options.defaultLoaders.babel.options.rootMode = "upward-optional";

    const foundRule = (rule) => {
      if (
        rule.use === options.defaultLoaders.babel ||
        (Array.isArray(rule.use) &&
          rule.use.includes(options.defaultLoaders.babel))
      ) {
        hasFoundRule = true;
        delete rule.include;
      }
      if (rule.oneOf) {
        rule.oneOf.forEach(foundRule);
      }
    };

    // Look at top level rules
    webpackConfig.module.rules.forEach(foundRule);

    if (!hasFoundRule) {
      throw new Error(
        "If you see this error, please open an issue with your Next.js version and @preconstruct/next version. The Next Babel loader could not be found"
      );
    }
    webpackConfig.module.rules.unshift({
      test: /\/node_modules\/@preconstruct\/hook\/index\.js$/,
      use: hookLoader,
    });

    if (options.isServer) {
      webpackConfig.resolve.mainFields = [
        "module",
        ...webpackConfig.resolve.mainFields.filter((x) => x !== "module"),
      ];
    }

    return originalWebpack
      ? originalWebpack(webpackConfig, options)
      : webpackConfig;
  };

  return nextConfig;
};
