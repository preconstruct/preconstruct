module.exports = (nextConfig = {}) => {
  let originalWebpack = nextConfig.webpack;

  nextConfig.webpack = (webpackConfig, options) => {
    webpackConfig.module.rules.push({
      test: /\.+(js|jsx|ts|tsx)$/,
      use: options.defaultLoaders.babel,
      exclude: modulePath => /node_modules/.test(modulePath)
    });
    return originalWebpack
      ? originalWebpack(webpackConfig, options)
      : webpackConfig;
  };

  return nextConfig;
};
