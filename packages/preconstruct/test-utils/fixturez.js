// @flow
// https://github.com/jamiebuilds/fixturez/
import path from "path";
import * as fsExtra from "fs-extra";
import onExit from "signal-exit";
import globby from "globby";
import uuid from "uuid/v4";

function fixturez(cwd: string) {
  let glob = "{fixtures,__fixtures__}/*";
  let rootDir = "/";

  function find(name: string): string {
    let search = cwd;
    let match;

    do {
      let paths = globby.sync(glob, {
        cwd: search,
        root: search,
        nodir: false,
        realpath: true
      });

      let matches = paths.filter(filePath => {
        return path.basename(filePath) === name;
      });

      if (matches.length > 1) {
        throw new Error(
          `Multiple fixtures for "${name}" found: ${matches.join(", ")}`
        );
      }

      if (matches.length) {
        match = matches[0];
        break;
      }

      if (search === rootDir) {
        break;
      }
    } while ((search = path.dirname(search)));

    if (!match) {
      throw new Error(
        `No fixture named "${name}" found searching for ${JSON.stringify(
          glob
        )} in "${cwd}" or any parent directory`
      );
    }

    return match;
  }

  let created = [];

  function temp(): string {
    let tempDir = fsExtra.realpathSync(
      path.join(__dirname, "node_modules", "fixture-copies", uuid())
    );
    created.push(tempDir);
    return tempDir;
  }

  function copy(name: string): string {
    let dest = path.join(temp(), name);
    fsExtra.copySync(find(name), dest);
    return dest;
  }

  function cleanup() {
    let err;
    created.forEach(tempDir => {
      try {
        fsExtra.removeSync(tempDir);
      } catch (e) {
        err = e;
      }
    });
    created.length = 0;
    if (err) throw err;
  }

  onExit(cleanup);

  return {
    find,
    copy
  };
}

module.exports = fixturez;
