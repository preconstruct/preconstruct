import { Plugin, SourceMapInput } from "rollup";
import MagicString from "magic-string";
import normalizePath from "normalize-path";
import path from "path";
import { getModuleDirectives } from "./directives";

const internalModulePrefix = "\0preserve boundary:";

export function serverComponentsPlugin({
  sourceMap,
}: {
  sourceMap: boolean;
}): Plugin {
  return {
    name: "server-components",
    async resolveId(source, importer, opts) {
      if (source.startsWith("__USE_CLIENT_IMPORT__")) {
        return { id: source, external: true };
      }
      const resolved = await this.resolve(source, importer, {
        ...opts,
        skipSelf: true,
      });
      if (resolved === null || resolved.external) {
        return resolved;
      }
      const loaded = await this.load(resolved);
      if (
        typeof loaded.meta.directivePreservedFile === "string" &&
        importer !== undefined
      ) {
        return {
          id:
            internalModulePrefix +
            (loaded.hasDefaultExport ? "1" : "0") +
            resolved.id,
        };
      }
      return resolved;
    },
    load(id) {
      if (id.startsWith(internalModulePrefix)) {
        const hasDefaultExport = id[internalModulePrefix.length] === "1";
        const innerId = id.slice(internalModulePrefix.length + 1);
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
