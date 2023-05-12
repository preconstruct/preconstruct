export function getModuleSpecifier(
  node: import("typescript").Node,
  typescript: typeof import("typescript")
) {
  // import/export { x } from "x"
  const isImportDeclaration = typescript.isImportDeclaration(node);
  if (
    (isImportDeclaration || typescript.isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    typescript.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }
  // type x = import('a').Blah
  if (
    typescript.isImportTypeNode(node) &&
    typescript.isLiteralTypeNode(node.argument) &&
    typescript.isStringLiteral(node.argument.literal)
  ) {
    return node.argument.literal;
  }
  // import x = require("x")
  if (
    typescript.isExternalModuleReference(node) &&
    typescript.isStringLiteral(node.expression)
  ) {
    return node.expression;
  }
}
