import normalizePath from "normalize-path";
import path from "path";
import { Plugin } from "rollup";
import { Package } from "../package";
import {
  getJsDefaultForMjsFilepath,
  jsDefaultForMjsTemplate,
  mjsTemplate,
} from "../utils";

export default function mjsProxyPlugin(pkg: Package): Plugin {
  const entrypointSources = new Set(pkg.entrypoints.map((e) => e.source));
  return {
    name: "mjs-proxy",
    async generateBundle(opts, bundle) {
      if (opts.format !== "cjs") return;
      for (const n in bundle) {
        const file = bundle[n];
        if (
          file.type === "asset" ||
          !file.isEntry ||
          file.facadeModuleId == null ||
          !entrypointSources.has(normalizePath(file.facadeModuleId))
        ) {
          continue;
        }

        const moduleInfo = this.getModuleInfo(file.facadeModuleId);
        let directive: "use client" | "use server" | undefined =
          moduleInfo?.meta.directivePreservedFile?.directive;

        let mjsPath = file.fileName.replace(/(?:\.prod)?\.js$/, ".mjs");
        const cjsRelativePath = `./${path.basename(mjsPath, ".mjs")}.js`;
        this.emitFile({
          type: "asset",
          fileName: mjsPath,
          source: mjsTemplate(
            file.exports,
            cjsRelativePath,
            mjsPath,
            directive
          ),
        });
        if (file.exports.includes("default")) {
          this.emitFile({
            type: "asset",
            fileName: getJsDefaultForMjsFilepath(mjsPath),
            source: jsDefaultForMjsTemplate(cjsRelativePath),
          });
        }
      }
    },
  };
}
