import JestWorkerModule from "jest-worker";
import { isCI } from "ci-info";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Worker = (
  JestWorkerModule as unknown as {
    default: typeof import("jest-worker").default;
  }
).default;

let shouldUseWorker =
  process.env.DISABLE_PRECONSTRUCT_WORKER !== "true" &&
  process.env.NODE_ENV !== "test" &&
  !isCI;

type WorkerApi = typeof import("./worker");

let worker: (InstanceType<typeof Worker> & WorkerApi) | WorkerApi | void;

export async function createWorker() {
  if (shouldUseWorker) {
    worker = new Worker(
      require.resolve("@preconstruct/cli/worker")
    ) as unknown as InstanceType<typeof Worker> & WorkerApi;
  } else {
    worker = await import("./worker");
  }
}

export function destroyWorker() {
  if (worker !== undefined && shouldUseWorker) {
    (worker as unknown as InstanceType<typeof Worker>).end();
    worker = undefined;
  }
}

export function getWorker() {
  if (worker === undefined) {
    throw new Error("worker not defined");
  }
  return worker;
}
