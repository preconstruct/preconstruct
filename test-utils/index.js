// @flow
import path from "path";
import * as fs from "fs-extra";
require("chalk").enabled = false;
// $FlowFixMe
console.error = jest.fn();
// $FlowFixMe
console.log = jest.fn();

export let logMock = {
  log: ((console.log: any): JestMockFn<any, void>),
  error: ((console.error: any): JestMockFn<any, void>)
};

afterEach(() => {
  logMock.log.mockReset();
  logMock.error.mockReset();
});

import init from "../src/init";
import { confirms } from "../src/messages";

export async function initBasic(directory: string) {
  confirms.writeMainField.mockReturnValue(true);
  confirms.writeModuleField.mockReturnValue(true);
  confirms.writeUmdBuilds.mockReturnValue(false);

  await init(directory);
  confirms.writeMainField.mockReset();
  confirms.writeModuleField.mockReset();
  confirms.writeUmdBuilds.mockReset();
}

function getPkgPath(tmpPath: string) {
  return path.join(tmpPath, "package.json");
}

export async function getPkg(filepath: string): Object {
  return JSON.parse(
    await fs.readFile(path.join(filepath, "package.json"), "utf-8")
  );
}

export async function modifyPkg(tmpPath: string, cb: Object => mixed) {
  let json = await getPkg(tmpPath);
  await cb(json);

  let pkgPath = getPkgPath(tmpPath);
  await fs.writeFile(pkgPath, JSON.stringify(json, null, 2));
}
