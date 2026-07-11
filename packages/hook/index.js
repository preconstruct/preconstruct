const { addHook } = require("pirates");
const sourceMapSupport = require("source-map-support");
const path = require("path");
const { createRequire } = require("module");

let EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

function commonjsPlugin(babelRequire) {
  const transforms = babelRequire("@babel/helper-module-transforms");
  return ({ types: t, template }) => ({
    name: "preconstruct-transform-modules-commonjs",
    visitor: {
      Program: {
        exit(programPath) {
          if (!transforms.isModule(programPath)) return;
          programPath.scope.rename("exports");
          programPath.scope.rename("module");
          programPath.scope.rename("require");
          programPath.scope.rename("__filename");
          programPath.scope.rename("__dirname");
          const {
            meta,
            headers,
          } = transforms.rewriteModuleStatementsAndPrepareHeader(programPath, {
            exportName: "exports",
            filename: this.file.opts.filename,
          });
          for (const [source, metadata] of meta.source) {
            const load = t.callExpression(t.identifier("require"), [
              t.stringLiteral(source),
            ]);
            let header;
            if (transforms.isSideEffectImport(metadata)) {
              header = t.expressionStatement(load);
            } else {
              const init =
                transforms.wrapInterop(programPath, load, metadata.interop) ||
                load;
              header = template.statement.ast`var ${metadata.name} = ${init};`;
            }
            header.loc = metadata.loc;
            headers.push(header);
            headers.push(
              ...transforms.buildNamespaceInitStatements(meta, metadata)
            );
          }
          transforms.ensureStatementsHoisted(headers);
          programPath.unshiftContainer("body", headers);
        },
      },
    },
  });
}

exports.___internalHook = (distDir, relativeToRoot, relativeToPkgDir) => {
  const cwd = path.resolve(distDir, relativeToRoot);
  const pkgDir = path.resolve(distDir, relativeToPkgDir);
  let resolvedBabelCore;
  try {
    resolvedBabelCore = require.resolve("@babel/core", { paths: [cwd] });
  } catch {
    throw new Error(
      "Preconstruct selected the Babel transform but @babel/core is not installed in the project"
    );
  }
  const babelRequire = createRequire(resolvedBabelCore);
  const babel = babelRequire("@babel/core");
  const babelPlugins = [commonjsPlugin(babelRequire)];
  let compiling = false;
  let sourceMaps = {};
  let needsToInstallSourceMapSupport = true;
  function compileHook(code, filename) {
    if (compiling) return code;
    // we do this lazily because jest has its own require implementation
    // which means preconstruct's require hook won't be run
    // so we don't want to install source map support because that will mess up
    // jest's source map support
    if (needsToInstallSourceMapSupport) {
      sourceMapSupport.install({
        environment: "node",
        retrieveSourceMap(source) {
          let map = sourceMaps[source];
          if (map !== undefined) {
            return {
              url: source,
              map,
            };
          } else {
            return null;
          }
        },
      });
      needsToInstallSourceMapSupport = false;
    }
    try {
      compiling = true;
      let output = babel.transformSync(code, {
        plugins: babelPlugins,
        filename,
        sourceMaps: "both",
        cwd,
      });
      sourceMaps[filename] = output.map;
      return output.code;
    } finally {
      compiling = false;
    }
  }

  return addHook(compileHook, {
    exts: EXTENSIONS,
    matcher: (filepath) => filepath.includes(pkgDir),
  });
};
