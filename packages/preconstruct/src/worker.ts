import * as babel from "@babel/core";
import { minify } from "terser";
import { RawSourceMap } from "rollup";

export function transformBabel(code: string, options: any) {
  options = JSON.parse(options);
  return babel.transformAsync(code, options).then(res => {
    let { code, map } = res!;
    return { code, map };
  });
}

export function transformTerser(code: string, optionsString: string) {
  const options = JSON.parse(optionsString);
  const result = minify(code, options);
  if (result.error) {
    return Promise.reject(result.error);
  } else {
    return Promise.resolve({
      code: result.code!,
      map: (result.map as any) as RawSourceMap
    });
  }
}
