// @ts-ignore
import { addDefault } from "@babel/helper-module-imports";

export function importHelperPlugin(babel: typeof import("@babel/core")) {
  return {
    pre(file: any) {
      const cachedHelpers: Record<string, babel.types.Identifier> = {};
      const previousHelperGenerator = file.get("helperGenerator");
      file.set("helperGenerator", (name: string) => {
        if (previousHelperGenerator) {
          const helperFromPrev = previousHelperGenerator(name);
          if (helperFromPrev != null) return helperFromPrev;
        }
        if (!file.availableHelper(name)) {
          return null;
        }

        if (cachedHelpers[name]) {
          return babel.types.identifier(cachedHelpers[name].name);
        }

        return (cachedHelpers[name] = addDefault(
          file.path,
          `\0rollupPluginBabelHelpers/${name}`
        ));
      });
    },
  };
}
