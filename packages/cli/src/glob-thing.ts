import parseGlob from "parse-glob";
import micromatch from "micromatch";
import * as fs from "fs-extra";
import path from "path";

export async function getUselessGlobsThatArentReallyGlobs(
  globs: string[],
  cwd: string
) {
  return Promise.all(
    globs.map(async (glob) => {
      let parsedGlobResult = parseGlob(glob);
      if (!parsedGlobResult.is.glob) {
        let result = micromatch([glob], globs);
        if (result.length) {
          let resolvedPath = path.resolve(cwd, glob);
          try {
            await fs.readdir(resolvedPath);
          } catch (err) {
            if (err.code !== "ENOENT") {
              throw err;
            }
            return resolvedPath;
          }
        }
      }
    })
  );
}
