// @flow
import Worker from "jest-worker";
let isCi = require("is-ci");

if (process.env.NODE_ENV === "test") {
  isCi = false;
}

let worker;

export function createWorker() {
  if (isCi) {
    worker = require("./worker");
  } else {
    worker = new Worker(require.resolve("./worker"));
  }
}

export function destroyWorker() {
  if (worker !== undefined) {
    if (!isCi) {
      worker.end();
    }

    worker = undefined;
  }
}

export function getWorker() {
  if (worker === undefined) {
    throw new Error("worker not defined");
  }
  return worker;
}
