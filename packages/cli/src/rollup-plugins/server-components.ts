import type { Plugin, SourceMapInput } from "rolldown";
import MagicString from "magic-string";
import normalizePath from "normalize-path";
import path from "path";
import { getModuleDirectives } from "./directives";
import * as fs from "fs-extra";

const internalModulePrefix = "\0preserve boundary:";

export function serverComponentsPlugin({
  sourceMap,
  root,
}: {
  sourceMap: boolean;
  root: string;
}): Plugin {
  return {
    name: "server-components",
    async resolveId(source, importer, opts) {
      if (source.startsWith("__USE_CLIENT_IMPORT__")) {
        return { id: source, external: true };
      }
      if (source.startsWith("\0")) {
        return null;
      }
      const resolved = await this.resolve(source, importer, {
        ...opts,
        skipSelf: true,
      });
      if (resolved === null || resolved.external) {
        return resolved;
      }
      if (resolved.id.startsWith("\0")) {
        return resolved;
      }
      let code: string;
      try {
        code = await fs.readFile(resolved.id, "utf8");
      } catch (err) {
        if (err.code === "ENOENT") return resolved;
        throw err;
      }
      const directive = getModuleDirectives(code).find(
        (item) => item.value === "use client" || item.value === "use server"
      );
      if (directive !== undefined && importer !== undefined) {
        const hasDefaultExport = this.parse(code).body.some((node) => {
          if (node.type === "ExportDefaultDeclaration") return true;
          if (node.type !== "ExportNamedDeclaration") return false;
          return node.specifiers.some(
            (specifier) =>
              specifier.exported.type === "Identifier" &&
              specifier.exported.name === "default"
          );
        });
        return {
          id:
            internalModulePrefix +
            (hasDefaultExport ? "1" : "0") +
            normalizePath(path.relative(root, resolved.id)),
        };
      }
      return resolved;
    },
    load(id) {
      if (id.startsWith(internalModulePrefix)) {
        const hasDefaultExport = id[internalModulePrefix.length] === "1";
        const innerId = path.resolve(
          root,
          id.slice(internalModulePrefix.length + 1)
        );
        const referenceId = this.emitFile({
          type: "chunk",
          id: innerId,
          preserveSignature: "strict",
        });

        // this name is appended for Rollup naming chunks/variables in the output
        const name = path
          .basename(innerId)
          .replace(/\.[tj]sx?$/, "")
          .replace(/[^\w]/g, "_");
        const importPath =
          "__USE_CLIENT_IMPORT__" +
          referenceId +
          `__USE_CLIENT_IMPORT__/${name}`;
        return `export * from ${JSON.stringify(importPath)};${
          hasDefaultExport
            ? `\nexport { default } from ${JSON.stringify(importPath)};`
            : ""
        }`;
      }
      return null;
    },
    transform(code, id) {
      if (id.startsWith("\0")) return null;
      const directives = getModuleDirectives(code);
      const directive = directives.find(
        (d) => d.value === "use client" || d.value === "use server"
      );
      if (!directive) return null;
      const magicString = new MagicString(code);
      magicString.remove(directive.start, directive.end);
      return {
        code: magicString.toString(),
        map: sourceMap
          ? (magicString.generateMap({ hires: true }) as SourceMapInput)
          : undefined,
        meta: {
          directivePreservedFile: directive.value,
        },
      };
    },
    renderChunk(code, chunk) {
      const magicString = new MagicString(code);
      if (chunk.facadeModuleId !== null) {
        const moduleInfo = this.getModuleInfo(chunk.facadeModuleId);
        const directive = moduleInfo?.meta.directivePreservedFile;
        if (directive) {
          magicString.prepend(`'${directive}';\n`);
        }
      }

      magicString.replace(
        /__USE_CLIENT_IMPORT__(\w+?)__USE_CLIENT_IMPORT__\/\w+/g,
        (_, referenceId) => {
          const relative = normalizePath(
            path.relative(
              path.dirname(chunk.fileName),
              this.getFileName(referenceId)
            )
          );
          return relative.startsWith("../") ? relative : `./${relative}`;
        }
      );
      const stringified = magicString.toString();
      if (stringified === code) {
        return null;
      }
      return {
        code: magicString.toString(),
        map: sourceMap
          ? (magicString.generateMap({ hires: true }) as SourceMapInput)
          : undefined,
      };
    },
  };
}
