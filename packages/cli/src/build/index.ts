import { Package } from "../package";
import { Project } from "../project";
import path from "path";
import { rollup, OutputAsset, OutputChunk, OutputOptions } from "rollup";
import * as logger from "../logger";
import {
  FatalError,
  UnexpectedBuildError,
  ScopelessError,
  BatchError,
} from "../errors";
import { getRollupConfigs } from "./config";
import { createWorker, destroyWorker } from "../worker-client";
import { validateProject } from "../validate";
import { cleanProjectBeforeBuild } from "./utils";
import { fsOutputFile } from "../utils";

// https://github.com/rollup/rollup/blob/28ffcf4c4a2ab4323091f63944b2a609b7bcd701/src/utils/sourceMappingURL.ts
// this looks ridiculous, but it prevents sourcemap tooling from mistaking
// this for an actual sourceMappingURL
let SOURCEMAPPING_URL = "sourceMa";
SOURCEMAPPING_URL += "ppingURL";

// https://github.com/rollup/rollup/blob/28ffcf4c4a2ab4323091f63944b2a609b7bcd701/src/rollup/rollup.ts#L333-L356
function writeOutputFile(
  outputFile: OutputAsset | OutputChunk,
  outputOptions: OutputOptions
): Promise<unknown> {
  const fileName = path.resolve(
    outputOptions.dir || path.dirname(outputOptions.file!),
    outputFile.fileName
  );
  let writeSourceMapPromise: Promise<void> | undefined;
  let source: string | Uint8Array;
  if (outputFile.type === "asset") {
    source = outputFile.source;
  } else {
    source = outputFile.code;
    if (outputOptions.sourcemap && outputFile.map) {
      let url: string;
      if (outputOptions.sourcemap === "inline") {
        url = outputFile.map.toUrl();
      } else {
        url = `${path.basename(outputFile.fileName)}.map`;
        writeSourceMapPromise = fsOutputFile(
          `${fileName}.map`,
          outputFile.map.toString()
        );
      }
      if (outputOptions.sourcemap !== "hidden") {
        source += `//# ${SOURCEMAPPING_URL}=${url}\n`;
      }
    }
  }

  return Promise.all([fsOutputFile(fileName, source), writeSourceMapPromise]);
}

async function buildPackage(pkg: Package) {
  let configs = getRollupConfigs(pkg);

  let outputs = await Promise.all(
    configs.map(async ({ config, outputs }) => {
      let bundle = await rollup(config);
      return Promise.all(
        outputs.map(async (outputConfig) => {
          return {
            output: (await bundle.generate(outputConfig)).output,
            outputConfig,
          };
        })
      );
    })
  );
  await Promise.all(
    outputs.map((x) => {
      return Promise.all(
        x.map((bundle) => {
          return Promise.all(
            bundle.output.map((output) => {
              return writeOutputFile(output, bundle.outputConfig);
            })
          );
        })
      );
    })
  );
}

async function retryableBuild(pkg: Package) {
  try {
    await buildPackage(pkg);
  } catch (err) {
    if (err instanceof Promise) {
      await err;
      await retryableBuild(pkg);
      return;
    }
    if (
      err instanceof FatalError ||
      err instanceof BatchError ||
      err instanceof ScopelessError
    ) {
      throw err;
    }
    if (err.pluginCode === "BABEL_PARSE_ERROR") {
      throw new ScopelessError(err.message);
    }
    throw new UnexpectedBuildError(err, pkg.name);
  }
}

export default async function build(directory: string) {
  // do more stuff with checking whether the repo is using yarn workspaces or bolt
  try {
    createWorker();
    let project = await Project.create(directory);

    validateProject(project);

    logger.info("building bundles!");

    await cleanProjectBeforeBuild(project);

    let errors: FatalError[] = [];

    await Promise.all(
      project.packages.map(async (pkg) => {
        try {
          await retryableBuild(pkg);
        } catch (err) {
          if (err instanceof BatchError) {
            errors.push(...err.errors);
          } else {
            errors.push(err);
          }
        }
      })
    );

    if (errors.length) {
      throw new BatchError(
        errors.sort((a, b) =>
          (a.scope + a.message).localeCompare(b.scope + b.message)
        )
      );
    }

    logger.success("built bundles!");
  } finally {
    destroyWorker();
  }
}
