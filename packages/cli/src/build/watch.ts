import { Project } from "../project";
import { Package } from "../package";
import chalk from "chalk";
import path from "path";
import ms from "ms";
import { getRollupConfigs, prepareUmdGlobals } from "./config";
import { success, info } from "../logger";
import { successes } from "../messages";
import { createWorker } from "../worker-client";
import { validateProject } from "../validate";
import { cleanProjectBeforeBuild } from "./utils";
import { watch } from "rolldown";

function relativePath(id: string) {
  return path.relative(process.cwd(), id);
}

async function watchPackage(pkg: Package) {
  await prepareUmdGlobals(pkg);
  const _configs = getRollupConfigs(pkg);

  let configs = _configs.map((config) => {
    return {
      ...config.config,
      output: config.outputs.map((output) => ({
        ...output,
        dynamicImportInCjs: pkg.project.dynamicImportInCjs,
      })),
    };
  });
  const watcher = watch(configs);
  let reject: (reason?: unknown) => void;
  let errPromise = new Promise((resolve, _reject) => {
    reject = _reject;
  });
  let startResolve: (value?: unknown) => void;
  let startPromise = new Promise((resolve) => {
    startResolve = resolve;
  });
  watcher.on("event", (event) => {
    // https://github.com/rollup/rollup/blob/aed954e4e6e8beabd47268916ff0955fbb20682d/bin/src/run/watch.ts#L71-L115
    switch (event.code) {
      case "ERROR": {
        reject(event.error);
        break;
      }

      case "START":
        startResolve();
        break;

      case "BUNDLE_START": {
        const bundleStartEvent = event as typeof event & {
          input?: string | string[] | Record<string, string>;
          output: string[];
        };
        info(
          chalk.cyan(
            `bundles ${chalk.bold(
              typeof bundleStartEvent.input === "string"
                ? relativePath(bundleStartEvent.input)
                : Array.isArray(bundleStartEvent.input)
                ? bundleStartEvent.input.map(relativePath).join(", ")
                : bundleStartEvent.input === undefined
                ? ""
                : Object.values(bundleStartEvent.input)
                    // @ts-ignore
                    .map(relativePath)
                    .join(", ")
            )} → ${chalk.bold(
              bundleStartEvent.output.map(relativePath).join(", ")
            )}...`
          ),
          pkg.name
        );
        break;
      }

      case "BUNDLE_END": {
        info(
          chalk.green(
            `created ${chalk.bold(
              event.output.map(relativePath).join(", ")
            )} in ${chalk.bold(ms(event.duration))}`
          ),
          pkg.name
        );
        break;
      }

      case "END": {
        info("waiting for changes...", pkg.name);
      }
    }
  });
  return { error: errPromise, start: startPromise, close: () => watcher.close() };
}

async function retryableWatch(
  pkg: Package,
  getPromises: (arg: { start: Promise<unknown> }) => unknown,
  depth: number
) {
  try {
    let { error, start, close } = await watchPackage(pkg);
    try {
      if (depth === 0) {
        getPromises({ start });
      }
      await error;
    } finally {
      await close();
    }
  } catch (err) {
    if (err instanceof Promise) {
      await err;
      await retryableWatch(pkg, getPromises, depth + 1);
      return;
    }
    throw err;
  }
}

export default async function build(directory: string) {
  await createWorker();
  let project = await Project.create(directory);
  validateProject(project);
  await cleanProjectBeforeBuild(project);
  let startCount = 0;
  await Promise.all(
    project.packages.map((pkg) =>
      retryableWatch(
        pkg,
        async ({ start }) => {
          await start;
          startCount++;
          if (startCount === project.packages.length) {
            success(successes.startedWatching);
          }
        },
        0
      )
    )
  );
}
