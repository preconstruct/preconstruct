import { createRequire } from "module";
import resolveFrom from "resolve-from";

function importHelperPlugin(babel: typeof import("@babel/core")) {
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

        const identifier = file.scope.generateUidIdentifier(name);
        file.path.unshiftContainer(
          "body",
          babel.types.importDeclaration(
            [babel.types.importDefaultSpecifier(identifier)],
            babel.types.stringLiteral(`\0rollupPluginBabelHelpers/${name}`)
          )
        );
        return (cachedHelpers[name] = identifier);
      });
    },
  };
}

export async function transformBabel(
  code: string,
  cwd: string,
  filename: string
) {
  const resolvedBabelCore = resolveFrom(cwd, "@babel/core");
  const babel = createRequire(resolvedBabelCore)(
    "@babel/core"
  ) as typeof import("@babel/core");

  return babel
    .transformAsync(code, {
      caller: {
        name: "rollup-plugin-babel",
        supportsStaticESM: true,
        supportsDynamicImport: true,
      },
      sourceMaps: true,
      cwd,
      filename,
      plugins: [importHelperPlugin],
    })
    .then((res) => {
      return { code: res!.code!, map: res!.map };
    });
}
