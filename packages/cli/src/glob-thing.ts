import parseGlob from "parse-glob";
import fs from "node:fs/promises";
import path from "path";
import normalizePath from "normalize-path";

export async function getUselessGlobsThatArentReallyGlobsForNewEntrypoints(
  globs: string[],
  files: string[],
  cwd: string
) {
  let filesSet = new Set(files.map((x) => normalizePath(x)));
  return (
    await Promise.all(
      globs.map(async (glob) => {
        let parsedGlobResult = parseGlob(glob);
        if (!parsedGlobResult.is.glob) {
          let filename = normalizePath(path.resolve(cwd, "src", glob));
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
