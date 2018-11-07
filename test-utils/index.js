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

jest.mock("../src/prompt");

let prompt: any = require("../src/prompt");

export async function initBasic(directory: string) {
  prompt.promptConfirm.mockImplementation(question => {
    switch (question) {
      case confirms.writeMainField: {
        return true;
      }
      case confirms.writeModuleField: {
        return true;
      }
      case confirms.writeUmdBuilds: {
        return false;
      }
      default: {
        throw new Error("unexpected case: " + question);
      }
    }
  });
  await init(directory);
  prompt.promptConfirm.mockReset();
}
