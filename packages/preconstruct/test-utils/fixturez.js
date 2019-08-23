// @flow
// https://github.com/jamiebuilds/fixturez/
import path from "path";
import * as fsExtra from "fs-extra";
import onExit from "signal-exit";
import _fixturez from "fixturez";
import uuid from "uuid/v4";

function fixturez(cwd: string) {
  let { find } = _fixturez(cwd);
  let created = [];
  function temp(): string {
    let tempDir = path.join(
      __dirname,
      "node_modules",
      "fixture-copies",
      uuid()
    );
    fsExtra.ensureDirSync(tempDir);
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
