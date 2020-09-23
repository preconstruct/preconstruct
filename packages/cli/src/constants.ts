export const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"] as const;

export const PKG_JSON_CONFIG_FIELD = "preconstruct" as const;

// https://github.com/rollup/plugins/blob/bc6a86cb795e8fa752ca078ae0f38e23daf01112/packages/babel/src/constants.js#L6-L8
// NOTE: DO NOT REMOVE the null character `\0` as it may be used by other plugins
// e.g. https://github.com/rollup/rollup-plugin-node-resolve/blob/313a3e32f432f9eb18cc4c231cc7aac6df317a51/src/index.js#L74
export const HELPERS = "\0rollupPluginBabelHelpers.js";
