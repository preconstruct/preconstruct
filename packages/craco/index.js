// based off https://github.com/jackwilsdon/craco-use-babelrc/blob/master/index.js

const { getLoaders, loaderByName } = require("@craco/craco");

// A list of all of the known transform keys from different CRA versions.
const BABEL_TRANSFORM_KEYS = ["^.+\\.(js|jsx)$", "^.+\\.(js|jsx|ts|tsx)$"];

const BABEL_TRANSFORM_PATH = require.resolve("./babel-jest-transform");

module.exports = {
  overrideWebpackConfig: ({ webpackConfig }) => {
    // Search for all instances of babel-loader.
    const { hasFoundAny, matches } = getLoaders(
      webpackConfig,
      loaderByName("babel-loader")
    );

    // If we can't find the loader then throw an error.
    if (!hasFoundAny) {
      throw new Error("could not find babel-loader");
    }

    let hasFoundRightLoader = false;

    // Loop through each match, enabling babelrc and clearing any presets.
    matches.forEach(({ loader }) => {
      if (loader.test.toString() === /\.(js|mjs|jsx|ts|tsx)$/.toString()) {
        hasFoundRightLoader = true;
        if (!loader.options) {
          loader.options = {};
        }
        delete loader.include;
        loader.exclude = /node_modules/;
        loader.options.babelrc = true;
        loader.options.configFile = true;
        loader.options.rootMode = "upward-optional";
        delete loader.options.presets;
      }
    });

    if (!hasFoundRightLoader) {
      throw new Error("The correct babel-loader could not be found");
    }

    return webpackConfig;
  },
  overrideJestConfig: ({ jestConfig }) => {
    // Replace any keys we know about with our custom transform.
    BABEL_TRANSFORM_KEYS.filter(key => jestConfig.transform[key]).forEach(
      key => (jestConfig.transform[key] = BABEL_TRANSFORM_PATH)
    );

    return jestConfig;
  }
};
