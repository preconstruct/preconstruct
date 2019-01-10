const { transformSync } = require("@babel/core");

exports.transform = function transform(code, options) {
  options = JSON.parse(options);
  let result = transformSync(code, options);

  return { code: result.code, map: result.map };
};
