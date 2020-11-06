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

const compareLines = (actual: string, expected: string): boolean => {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");

  if (actualLines.length !== expectedLines.length) {
    return false;
  }

  for (let i = 0; i <= actualLines.length; i++) {
    if (actualLines[i] === expectedLines[i]) {
      continue;
    }
    if (/\S/.test(actualLines[i]) || /\S/.test(expectedLines[i])) {
      return false;
    }
    // both contain just whitespaces, ignore a mismatch and continue
  }

  return true;
};

export const rules = {
  format: createRule<[], MessageId>({
    name: "format",
    defaultOptions: [],
    meta: {
      docs: {
        category: "Stylistic Issues",
        description: "",
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
                  return indentation + line;
                })
                .join("\n"); //+
            //   "\n" +
            //   "".padEnd(node.tag.loc.start.column);
            if (!compareLines(str, formatted)) {
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
