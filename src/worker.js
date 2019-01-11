const babel = require("@babel/core");
const prettier = require("prettier");

exports.transformBabel = function transformBabel(code, options) {
  options = JSON.parse(options);
  let result = babel.transformSync(code, options);

  return Promise.resolve({ code: result.code, map: result.map });
};

exports.transformPrettier = function transformPrettier(code) {
  return Promise.resolve(prettier.format(code, { parser: "babylon" }));
};
