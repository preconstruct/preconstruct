import { Plugin, SourceDescription } from "rollup";
import { walk } from "estree-walker";
import isReference from "is-reference";
import MagicString from "magic-string";

export function inlineProcessEnvNodeEnv({
  sourceMap,
}: {
  sourceMap: boolean;
}): Plugin {
  return {
    name: "inline-process-env-node-env-production",
    transform(code, id) {
      if (code.includes("process.env" + ".NODE_ENV")) {
        let magicString = new MagicString(code);
        const ast = (() => {
          const babelMeta = this.getModuleInfo(id)!.meta.babel;
          if (babelMeta?.codeAtBabelTime === code) {
            return this.getModuleInfo(id)!.meta.babel.ast;
          }
          return this.parse(code);
        })();
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
                value: "production",
                raw: '"production"',
              });
              magicString.overwrite(start, end, '"production"'.padStart(len));
            }
          },
        });
        let output: SourceDescription = { code: magicString.toString(), ast };
        if (sourceMap) {
          output.map = magicString.generateMap({ hires: true });
        }
        return output;
      }
      return null;
    },
  };
}
