import * as babel from "@babel/core";

const helperPath = /^@babel\/runtime\/helpers\/esm\/(\w+)$/;

export default function rewriteCjsRuntimeHelpers() {
    return {
        name: "rewrite-cjs-runtime-helpers",
        async renderChunk(code, chunkInfo, { format }) {
            if (format !== 'cjs') {
                return null;
            }

            return (
                await babel.transformAsync(code, {
                    babelrc: false,
                    configFile: false,
                    plugins: [
                        ({ types: t }) => ({
                            visitor: {
                                CallExpression(path) {
                                    if (path.get('callee').node.name !== 'require') {
                                        return;
                                    }

                                    const argument = path.get("arguments.0");

                                    if (!argument.isStringLiteral()) {
                                        return;
                                    }

                                    const nodeModule = argument.node.value;

                                    if (!helperPath.test(nodeModule)) {
                                        return;
                                    }

                                    const rewritten = nodeModule.replace(helperPath, "@babel/runtime/helpers/$1");

                                    argument.replaceWith(t.stringLiteral(rewritten));
                                }
                            }
                        })
                    ],
                })
            ).code
        }
    }
}
