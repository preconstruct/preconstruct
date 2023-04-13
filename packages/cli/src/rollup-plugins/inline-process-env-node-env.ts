import { Plugin, SourceDescription, SourceMapInput } from "rollup";
import { walk } from "estree-walker";
import isReference from "is-reference";
import MagicString from "magic-string";

export function inlineProcessEnvNodeEnv({
  sourceMap,
  value,
}: {
  sourceMap: boolean;
  value: "development" | "production";
}): Plugin {
  const replace = function (ast: any, code: string) {
    let magicString = new MagicString(code);

    walk(ast, {
      enter(n, p) {
        const parent = p as import("estree").Node;
        const node = n as import("estree").Node;
        if (
          node.type === "MemberExpression" &&
          !node.computed &&
          node.object.type === "MemberExpression" &&
          !node.object.computed &&
          node.object.object.type === "Identifier" &&
          node.object.object.name === "process" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "env" &&
          node.property.type === "Identifier" &&
          node.property.name === "NODE_ENV" &&
          isReference(node as any, parent as any) &&
          parent.type !== "AssignmentExpression"
        ) {
          const start: number = (node as any).start;
          const end: number = (node as any).end;
          const len = end - start;
          this.replace({
            type: "Literal",
            // @ts-ignore
            start,
            end,
            value,
            raw: `"${value}"`,
          });
          magicString.overwrite(start, end, `"${value}"`.padStart(len));
        }
      },
    });
    let output: SourceDescription = { code: magicString.toString(), ast };
    if (sourceMap) {
      output.map = magicString.generateMap({
        hires: true,
      }) as SourceMapInput;
    }
    return output;
  };
  return {
    name: "inline-process-env-node-env",
    transform: function (code, id) {
      if (!code.includes("process.env" + ".NODE_ENV")) {
        return null;
      }
      const ast = (() => {
        const babelMeta = this.getModuleInfo(id)!.meta.babel;
        if (babelMeta?.codeAtBabelTime === code) {
          return this.getModuleInfo(id)!.meta.babel.ast;
        }
        return this.parse(code);
      })();
      return replace(ast, code);
    },
    renderChunk: function (code, id) {
      if (!code.includes("process.env" + ".NODE_ENV")) {
        return null;
      }
      return replace(this.parse(code), code);
    },
  };
}
