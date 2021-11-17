import { ESLintUtils } from "@typescript-eslint/experimental-utils";
import prettier from "prettier";
import path from "path";
const createRule = ESLintUtils.RuleCreator((name) => `${name}.md`);

const messages = {
  unformatted: "The content of this is not formatted",
};

type MessageId = keyof typeof messages;

const tags = {
  js: true,
  ts: true,
  tsx: true,
};

export const rules = {
  format: createRule<[], MessageId>({
    name: "format",
    defaultOptions: [],
    meta: {
      docs: {
        description: "Stylistic Issues",
        recommended: "error",
      },
      messages,
      schema: [],
      type: "layout",
      fixable: "whitespace",
    },
    create(context) {
      return {
        TaggedTemplateExpression(node) {
          if (
            node.tag.type === "Identifier" &&
            node.tag.name in tags &&
            node.quasi.expressions.length === 0
          ) {
            const str = node.quasi.quasis[0].value.cooked;
            const indentation = "".padEnd(node.tag.loc.start.column + 2);
            const lines = prettier
              .format(str, {
                filepath: path.join(
                  path.dirname(context.getFilename()),
                  `lint.${node.tag.name}`
                ),
              })
              .split("\n");
            const formatted =
              "\n" +
              lines
                .map((line, i) => {
                  if (i === lines.length - 1) {
                    return "".padEnd(node.tag.loc.start.column) + line;
                  }
                  if (line === "") {
                    return "";
                  }
                  return indentation + line;
                })
                .join("\n"); //+
            //   "\n" +
            //   "".padEnd(node.tag.loc.start.column);
            if (formatted !== str) {
              context.report({
                messageId: "unformatted",
                node: node.tag,
                fix(fixer) {
                  return fixer.replaceText(node.quasi, `\`${formatted}\``);
                },
              });
            }
          }
        },
      };
    },
  }),
};
