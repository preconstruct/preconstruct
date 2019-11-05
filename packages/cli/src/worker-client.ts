import Worker from "jest-worker";

let shouldUseWorker = process.env.DISABLE_PRECONSTRUCT_WORKER !== "true";

let worker: (Worker & typeof import("./worker")) | void;

let unsafeRequire = require;

export function createWorker() {
  if (shouldUseWorker) {
    worker = new Worker(require.resolve("@preconstruct/cli/worker")) as Worker &
      typeof import("./worker");
  } else {
    worker = unsafeRequire("@preconstruct/cli/worker");
  }
}

export function destroyWorker() {
  if (worker !== undefined && shouldUseWorker) {
    worker.end();
    worker = undefined;
  }
}

export function getWorker() {
  if (worker === undefined) {
    throw new Error("worker not defined");
  }
  return worker;
}
