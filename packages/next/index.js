module.exports = (nextConfig = {}) => {
  let originalWebpack = nextConfig.webpack;

  nextConfig.webpack = (webpackConfig, options) => {
    let hasFoundRule = false;
    options.defaultLoaders.babel.options.rootMode = "upward-optional";
    debugger;
    webpackConfig.module.rules.forEach(rule => {
      if (
        rule.use === options.defaultLoaders.babel ||
        (Array.isArray(rule.use) &&
          rule.use.includes(options.defaultLoaders.babel))
      ) {
        hasFoundRule = true;
        debugger;
        delete rule.include;
        debugger;
      }
    });
    if (!hasFoundRule) {
      throw new Error(
        "If you see this error, please open an issue with your Next.js version and @preconstruct/next version. The Next Babel loader could not be found"
      );
    }
    debugger;
    return originalWebpack
      ? originalWebpack(webpackConfig, options)
      : webpackConfig;
  };

  return nextConfig;
};
