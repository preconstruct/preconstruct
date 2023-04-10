import { Plugin, SourceMapInput } from "rollup";
import MagicString from "magic-string";
import normalizePath from "normalize-path";
import path from "path";
import { getModuleDirectives } from "./directives";

export function serverComponentsPlugin({
  sourceMap,
}: {
  sourceMap: boolean;
}): Plugin {
  return {
    name: "server-components",
    async resolveId(source, importer, opts) {
      const resolved = await this.resolve(source, importer, {
        ...opts,
        skipSelf: true,
      });
      if (resolved === null || resolved.external) {
        return resolved;
      }
      const loaded = await this.load(resolved);
      if (
        typeof loaded.meta.useClientReferenceId === "string" &&
        importer !== undefined
      ) {
        // this name is appended for Rollup naming chunks/variables in the output
        const name = path
          .basename(resolved.id)
          .replace(/\.[tj]sx?$/, "")
          .replace(/[^\w]/g, "_");
        const id = `__USE_CLIENT_IMPORT__${loaded.meta.useClientReferenceId}__USE_CLIENT_IMPORT__/${name}`;

        return {
          id,
          external: true,
        };
      }
      return resolved;
    },
    transform(code, id) {
      if (id.startsWith("\0")) return null;
      const directives = getModuleDirectives(code);
      const useClientDirective = directives.find(
        (d) => d.value === "use client"
      );
      if (useClientDirective) {
        const magicString = new MagicString(code);
        const referenceId = this.emitFile({
          type: "chunk",
          id,
          preserveSignature: "allow-extension",
        });
        magicString.remove(useClientDirective.start, useClientDirective.end);
        return {
          code: magicString.toString(),
          map: sourceMap
            ? (magicString.generateMap({ hires: true }) as SourceMapInput)
            : undefined,
          meta: {
            useClientReferenceId: referenceId,
          },
        };
      }
      return null;
    },
    renderChunk(code, chunk) {
      const magicString = new MagicString(code);
      if (chunk.facadeModuleId !== null) {
        const moduleInfo = this.getModuleInfo(chunk.facadeModuleId);
        if (moduleInfo?.meta.useClientReferenceId) {
          magicString.prepend("'use client';\n");
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
