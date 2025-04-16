import picomatch from "picomatch";
import * as fs from "fs-extra";
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
        let parseResult = picomatch.scan(glob);
        let isDynamicGlob = parseResult.isGlob || parseResult.negated;
        if (!isDynamicGlob) {
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
