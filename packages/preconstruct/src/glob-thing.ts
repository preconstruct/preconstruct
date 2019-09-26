import globby from "globby";
import parseGlob from "parse-glob";
import micromatch from "micromatch";
import * as fs from "fs-extra";
import path from "path";

export async function execGlobs(globs: string[], cwd: string) {
  return (await Promise.all(
    globs.map(async glob => {
      let parsedGlobResult = parseGlob(glob);
      if (!parsedGlobResult.is.glob) {
        let resolvedPath = path.resolve(cwd, glob);
        try {
          let contents = await fs.readdir(resolvedPath);
          if (!contents.includes("package.json")) {
            return {
              dir: resolvedPath,
              type: "no-package-json"
            } as const;
          }
        } catch (err) {
          if (err.code !== "ENOENT") {
            throw err;
          }
          return {
            dir: resolvedPath,
            type: "no-dir"
          } as const;
        }
      }
      return undefined as { dir: string };
    })
  )).filter(x => x);
}
