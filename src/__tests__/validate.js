// @flow
import fixturez from "fixturez";
import path from "path";
import * as fs from "fs-extra";
import validate from "../validate";
import { infos, confirms, errors, successes } from "../messages";
import * as logger from "../logger";

jest.mock("../src/logger");

const f = fixturez(__dirname);

test("reports correct result on valid package", async () => {
  let tmpPath = f.find("valid-package");

  await validate(tmpPath);
  expect(logger.info).toBeCalledWith(infos.validEntrypoint);
  expect(logger.info).toBeCalledWith(infos.validMainField);
  expect(logger.info).toBeCalledWith(infos.validModuleField);

  expect(logger.info).toBeCalledTimes(3);
  expect(logger.success).toBeCalledWith(successes.validPackage);
});
