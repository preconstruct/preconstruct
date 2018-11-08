// @flow

require("chalk").enabled = false;
// $FlowFixMe
console.error = jest.fn();
// $FlowFixMe
console.log = jest.fn();

export let logMock = {
  log: ((console.log: any): JestMockFn<any, void>),
  error: ((console.error: any): JestMockFn<any, void>)
};

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
