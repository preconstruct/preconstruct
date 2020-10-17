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
        const modInfo = this.getModuleInfo(id);
        const ast = modInfo && modInfo.ast ? modInfo.ast : this.parse(code);
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
              isReference(node, parent) &&
              parent.type !== "AssignmentExpression"
            ) {
              magicString.overwrite(
                (node as any).start,
                (node as any).end,
                JSON.stringify("production")
              );
            }
          },
        });
        let output: SourceDescription = { code: magicString.toString() };
        if (sourceMap) {
          output.map = magicString.generateMap({ hires: true });
        }
        return output;
      }
      return null;
    },
  };
}
