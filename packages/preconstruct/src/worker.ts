import * as babel from "@babel/core";
import { minify } from "terser";

export function transformBabel(code, options) {
  options = JSON.parse(options);
  return babel.transformAsync(code, options).then(({ code, map }) => {
    return { code, map };
  });
}

export function transformTerser(code, optionsString) {
  const options = JSON.parse(optionsString);
  const result = minify(code, options);
  if (result.error) {
    return Promise.reject(result.error);
  } else {
    return Promise.resolve(result);
  }
}
