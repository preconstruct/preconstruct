import picomatch from "picomatch";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizePath } from "./utils";

export async function getUselessGlobsThatArentReallyGlobsForNewEntrypoints(
  globs: string[],
  files: string[],
  cwd: string
) {
  let filesSet = new Set(files.map((x) => normalizePath(x)));
  return (
    await Promise.all(
      globs.map(async (glob) => {
        let parsedGlobResult = picomatch.scan(glob);
        if (!(parsedGlobResult.isGlob || parsedGlobResult.negated)) {
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
