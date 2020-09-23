import { HELPERS } from "./constants";
import { lazyRequire } from "lazy-require.macro";
type LoadPartialConfigAsync = (
  options: babel.TransformOptions
) => Promise<Readonly<babel.PartialConfig> | null>;

function importHelperPlugin() {
  const { addNamed } = lazyRequire<
    // @ts-ignore
    typeof import("@babel/helper-module-imports")
  >();
  return {
    pre(file: any) {
      const cachedHelpers: Record<string, babel.types.Identifier> = {};
      file.set("helperGenerator", (name: string) => {
        if (!file.availableHelper(name)) {
          return null;
        }

        if (cachedHelpers[name]) {
          return cachedHelpers[name];
        }

        return (cachedHelpers[name] = addNamed(file.path, name, HELPERS));
      });
    },
  };
}
export async function transformBabel(
  code: string,
  cwd: string,
  filename: string
) {
  const babel = lazyRequire<typeof import("@babel/core")>();
  const config = await (
    ((babel as any).loadPartialConfigAsync as LoadPartialConfigAsync) ||
    babel.loadPartialConfig
  )({
    caller: {
      name: "rollup-plugin-babel",
      supportsStaticESM: true,
      supportsDynamicImport: true,
    },
    sourceMaps: true,
    cwd,
    filename,
  });
  if (!config) {
    return null;
  }
  debugger;
  return babel
    .transformAsync(code, {
      ...config.options,
      // note that we're doing this whole thing because we want to add the plugin _before_ user's plugins
      // so that if they're using @babel/plugin-transform-runtime(which they should be), it'll work
      plugins: [importHelperPlugin, ...(config.options.plugins || [])],
    })
    .then((res) => {
      let { code, map } = res!;
      return { code, map };
    });
}

export function transformTerser(code: string, optionsString: string) {
  const { minify } = lazyRequire<typeof import("terser")>();
  const options = JSON.parse(optionsString);
  return minify(code, options) as Promise<{ code: string; map: any }>;
}
