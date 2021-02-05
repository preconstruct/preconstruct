const resolve = require("resolve");
const path = require("path");

module.exports = (nextConfig = {}) => {
  let originalWebpack = nextConfig.webpack;

  nextConfig.webpack = (webpackConfig, options) => {
    let hasFoundRule = false;
    options.defaultLoaders.babel.options.rootMode = "upward-optional";
    webpackConfig.module.rules.forEach((rule) => {
      if (
        rule.use === options.defaultLoaders.babel ||
        (Array.isArray(rule.use) &&
          rule.use.includes(options.defaultLoaders.babel))
      ) {
        hasFoundRule = true;
        delete rule.include;
      }
    });
    if (!hasFoundRule) {
      throw new Error(
        "If you see this error, please open an issue with your Next.js version and @preconstruct/next version. The Next Babel loader could not be found"
      );
    }
    const { extensions } = webpackConfig.resolve;
    if (options.isServer && !options.isServerless) {
      let externalsFunc = webpackConfig.externals[0];
      let makeCallback = (callback, context, request) => (err, result) => {
        if (err) {
          return callback(err);
        }
        if (result === undefined) {
          return callback();
        }
        if (
          result === "commonjs next" ||
          result.startsWith(`commonjs next${path.posix.sep}`) ||
          result.startsWith(`commonjs next${path.win32.sep}`)
        ) {
          return callback(undefined, result);
        }

        const resolved = resolve.sync(request, {
          basedir: context,
          extensions,
          preserveSymlinks: false,
        });
        if (resolved.includes("node_modules")) {
          return callback(undefined, request);
        }
        callback();
      };
      webpackConfig.externals = [
        externalsFunc.length === 2
          ? ({ context, request }, callback) => {
              externalsFunc(
                { context, request },
                makeCallback(callback, context, request)
              );
            }
          : (context, request, callback) => {
              externalsFunc(
                context,
                request,
                makeCallback(callback, context, request)
              );
            },
      ];
    }

    return originalWebpack
      ? originalWebpack(webpackConfig, options)
      : webpackConfig;
  };

  return nextConfig;
};
