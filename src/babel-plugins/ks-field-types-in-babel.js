module.exports = function(babel) {
  const { types: t } = babel;
  return {
    visitor: {
      CallExpression(path) {
        // TODO: do this via import stuff
        if (path.get("callee").node.name !== "importView") {
          return;
        }
        // TODO: validate that it's a string literal and throw a nice error when it's not explaining why it has to be a string literal
        let stringLiteral = path.get("arguments.0");
        stringLiteral.replaceWith(
          t.callExpression(t.import(), [stringLiteral.node])
        );
      }
    }
  };
};
