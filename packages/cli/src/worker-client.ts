import Worker from "jest-worker";
// @ts-ignore
import isCI from "is-ci";

let shouldUseWorker =
  process.env.DISABLE_PRECONSTRUCT_WORKER !== "true" &&
  process.env.NODE_ENV !== "test" &&
  !isCI;

type RawWorkerImport = typeof import("./worker");

type WorkerExports = {
  [Key in keyof RawWorkerImport]: ReturnType<
    RawWorkerImport[Key]
  > extends Promise<any>
    ? RawWorkerImport[Key]
    : (
        ...args: Parameters<RawWorkerImport[Key]>
      ) => Promise<ReturnType<RawWorkerImport[Key]>>;
};

let worker: (Worker & WorkerExports) | undefined;

export function createWorker() {
  if (shouldUseWorker) {
    worker = new Worker(require.resolve("@preconstruct/cli/worker")) as any;
  } else {
    worker = require("@preconstruct/cli/worker");
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
