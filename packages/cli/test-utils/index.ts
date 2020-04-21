import path from "path";
import * as fs from "fs-extra";
import globby from "globby";
import fixturez from "fixturez";
import spawn from "spawndamnit";
// @ts-ignore
import initHasher from "xxhash-wasm";
// @ts-ignore
import profiler from "v8-profiler-next";

let f = fixturez(__dirname);

require("chalk").enabled = false;
console.error = jest.fn();
console.log = jest.fn();

export let logMock = {
  log: (console.log as any) as jest.MockInstance<void, any>,
  error: (console.error as any) as jest.MockInstance<void, any>
};

afterEach(() => {
  logMock.log.mockReset();
  logMock.error.mockReset();
});

import init from "../src/init";
import { confirms } from "../src/messages";

let mockedConfirms = confirms as jest.Mocked<typeof confirms>;

export async function initBasic(directory: string) {
  mockedConfirms.writeMainField.mockReturnValue(Promise.resolve(true));
  mockedConfirms.writeModuleField.mockReturnValue(Promise.resolve(true));

  await init(directory);
  mockedConfirms.writeMainField.mockReset();
  mockedConfirms.writeModuleField.mockReset();
}

export function profile(name: string) {
  profiler.startProfiling(name, true);

  return () => {
    let profile = profiler.stopProfiling();

    new Promise<void>(resolve =>
      profile
        .export()
        .pipe(fs.createWriteStream(name + ".cpuprofile"))
        .on("finish", function() {
          profile.delete();
          resolve();
        })
    );
  };
}

function getPkgPath(tmpPath: string) {
  return path.join(tmpPath, "package.json");
}

export async function getPkg(
  filepath: string
): Promise<{ [key: string]: any }> {
  return JSON.parse(
    await fs.readFile(path.join(filepath, "package.json"), "utf-8")
  );
}

export async function modifyPkg(
  tmpPath: string,
  cb: (pkgJson: { [key: string]: any }) => unknown
) {
  let json = await getPkg(tmpPath);
  await cb(json);

  let pkgPath = getPkgPath(tmpPath);
  await fs.writeFile(pkgPath, JSON.stringify(json, null, 2));
}

export let createPackageCheckTestCreator = (
  doResult: (tmpPath: string) => Promise<void>
) => {
  let createTestCreator = (
    testFn: (testName: string, func: () => Promise<void>) => void
  ) => async (
    testName: string,
    entrypoints: { [key: string]: any },
    cb: (
      doThing: () => Promise<{ [key: string]: any }>,
      stuff: { dir: string }
    ) => Promise<void>
  ) => {
    testFn(testName, async () => {
      let tmpPath = f.copy("template-simple-package");
      let things = Object.keys(entrypoints);
      await Promise.all(
        things.map(async entrypointPath => {
          let content = entrypoints[entrypointPath];
          let filepath = path.join(tmpPath, entrypointPath, "package.json");
          await fs.ensureFile(filepath);
          await fs.writeFile(filepath, JSON.stringify(content, null, 2));
        })
      );

      await cb(
        async () => {
          await doResult(tmpPath);

          let newThings: Record<string, any> = {};

          await Promise.all(
            things.map(async entrypointPath => {
              newThings[entrypointPath] = JSON.parse(
                await fs.readFile(
                  path.join(tmpPath, entrypointPath, "package.json"),
                  "utf8"
                )
              );
            })
          );
          return newThings;
        },
        { dir: tmpPath }
      );
    });
  };
  let testFn = createTestCreator(test);
  // @ts-ignore
  testFn.only = createTestCreator(test.only);
  // @ts-ignore
  testFn.skip = createTestCreator(test.skip);
  return testFn as typeof testFn & { only: typeof testFn; skip: typeof testFn };
};

export async function snapshotDistFiles(tmpPath: string) {
  let distPath = path.join(tmpPath, "dist");
  let distFiles;
  try {
    distFiles = await fs.readdir(distPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(distPath + " does not exist");
    }
    throw err;
  }

  await Promise.all(
    distFiles.map(async x => {
      expect(
        await fs.readFile(path.join(distPath, x), "utf-8")
      ).toMatchSnapshot(x);
    })
  );
}

export let stripHashes = async (chunkName: string) => {
  let { h64 } = await initHasher();

  let transformer = (pathname: string, content: string) => {
    return pathname.replace(new RegExp(`${chunkName}-[^\\.]+`, "g"), () => {
      return `chunk-this-is-not-the-real-hash-${h64(content)}`;
    });
  };
  return {
    transformPath: transformer,
    transformContent: (content: string) => {
      return content.replace(new RegExp(`${chunkName}-[^\\.]+`, "g"), () => {
        return "chunk-some-hash";
      });
    }
  };
};

export async function snapshotDirectory(
  tmpPath: string,
  {
    files = "js",
    filterPath = x => true,
    transformPath = x => x,
    transformContent = x => x
  }: {
    files?: "all" | "js";
    filterPath?: (path: string) => boolean;
    transformPath?: (path: string, contents: string) => string;
    transformContent?: (content: string) => string;
  } = {}
) {
  let paths = await globby(
    [`**/${files === "js" ? "*.js" : "*"}`, "!node_modules/**", "!yarn.lock"],
    {
      cwd: tmpPath
    }
  );

  await Promise.all(
    paths.filter(fp => filterPath(fp)).map(async x => {
      let content = transformContent(
        await fs.readFile(path.join(tmpPath, x), "utf-8")
      );
      if (x.endsWith(".json") && !x.endsWith("tsconfig.json")) {
        content = JSON.parse(content);
      }
      expect(content).toMatchSnapshot(transformPath(x, content));
    })
  );
}

export async function install(tmpPath: string) {
  await spawn("yarn", ["install"], { cwd: tmpPath });
}
