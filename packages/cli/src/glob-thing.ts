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

export async function getUselessGlobsThatArentReallyGlobsForNewEntrypoints(
  globs: string[],
  files: string[],
  cwd: string
) {
  let filesSet = new Set(files);
  return (
    await Promise.all(
      globs.map(async (glob) => {
        let parsedGlobResult = parseGlob(glob);
        if (!parsedGlobResult.is.glob) {
          let filename = path.resolve(cwd, "src", glob);
          if (filesSet.has(filename)) return;
          try {
            await fs.stat(filename);
          } catch (err) {
            if (err.code === "ENOENT") {
              return { filename, glob, exists: false };
            }
            throw err;
          }
          return { filename, glob, exists: true };
        }
      })
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);
}
