import * as babel from "@babel/core";
import { minify } from "terser";

export function transformBabel(code: string, options: any) {
  options = JSON.parse(options);
  return babel.transformAsync(code, options).then((res) => {
    let { code, map } = res!;
    return { code, map };
  });
}

export function transformTerser(code: string, optionsString: string) {
  const options = JSON.parse(optionsString);
  return minify(code, options) as Promise<{ code: string; map: any }>;
}
