import { AcornNode, Plugin, SourceDescription, SourceMapInput } from "rollup";
import { Program } from "estree";
import MagicString from "magic-string";

export function serverComponentsPlugin({
  sourceMap,
}: {
  sourceMap: boolean;
}): Plugin {
  return {
    name: "server-components",

    transform(code, id) {
      if (/['"]use client['"]/.test(code)) {
        const ast: Program = (() => {
          const babelMeta = this.getModuleInfo(id)!.meta.babel;
          if (babelMeta?.codeAtBabelTime === code) {
            return this.getModuleInfo(id)!.meta.babel.ast;
          }
          return this.parse(code);
        })();

        for (const [idx, node] of ast.body.entries()) {
          if (
            node.type !== "ExpressionStatement" ||
            node.expression.type !== "Literal" ||
            typeof node.expression.value !== "string"
          ) {
            return;
          }
          if (node.expression.value === "use client") {
            let magicString = new MagicString(code);
            this.emitFile({ type: "chunk", id });
            ast.body.splice(idx, 1);
            const start: number = (node as any).start;
            const end: number = (node as any).end;
            const len = end - start;
            magicString.overwrite(start, end, " ".repeat(len));
            let output: SourceDescription = {
              code: magicString.toString(),
              ast: (ast as unknown) as AcornNode,
            };

            if (sourceMap) {
              output.map = magicString.generateMap({
                hires: true,
              }) as SourceMapInput;
            }
            if (!output.meta) {
              output.meta = {};
            }
            output.meta.isUseClientEntry = true;
            return output;
          }
        }
      }
      return null;
    },
    renderChunk(code, chunk) {
      if (chunk.facadeModuleId !== null) {
        const moduleInfo = this.getModuleInfo(chunk.facadeModuleId);
        if (moduleInfo?.meta.isUseClientEntry) {
          const magicString = new MagicString(code);
          magicString.prepend("'use client';\n");
          const chunkInfo: { code: string; map?: SourceMapInput } = {
            code: magicString.toString(),
          };
          if (sourceMap) {
            chunkInfo.map = magicString.generateMap({
              hires: true,
            }) as SourceMapInput;
          }
          return chunkInfo;
        }
      }
      return null;
    },
  };
}
