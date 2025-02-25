import { Project } from "./project";
import { promptInput } from "./prompt";
import * as logger from "./logger";
import { errors, inputs } from "./messages";
import {
  isUmdNameSpecified,
  EXPERIMENTAL_FLAGS,
  FORMER_FLAGS_THAT_ARE_ENABLED_NOW,
} from "./validate";
import { BatchError, FatalError } from "./errors";
import { Package } from "./package";
import { setFieldInOrder, exportsField } from "./utils";

let keys: <Obj>(obj: Obj) => (keyof Obj)[] = Object.keys;

async function fixPackage(pkg: Package): Promise<() => Promise<boolean>> {
  if (pkg.entrypoints.length === 0) {
    throw new FatalError(errors.noEntrypoints, pkg.name);
  }

  const exportsFieldConfig = pkg.exportsFieldConfig();

  let fields = {
    main: true,
    module:
      pkg.entrypoints.some((x) => x.json.module !== undefined) ||
      !!exportsFieldConfig,
    "umd:main": pkg.entrypoints.some((x) => x.json["umd:main"] !== undefined),
    browser: pkg.entrypoints.some((x) => x.json.browser !== undefined),
  };

  if (exportsFieldConfig?.conditions.kind === "legacy") {
    if (fields.browser || exportsFieldConfig.conditions.envs.has("browser")) {
      if (typeof pkg.json.preconstruct.exports !== "object") {
        pkg.json.preconstruct.exports = {};
      }
      if (!pkg.json.preconstruct.exports.envConditions) {
        pkg.json.preconstruct.exports.envConditions = [];
      }
      if (!pkg.json.preconstruct.exports.envConditions.includes("browser")) {
        pkg.json.preconstruct.exports.envConditions.push("browser");
      }
      fields.browser = true;
    }
  }

  if (pkg.isTypeModule()) {
    keys(fields).forEach((field) => {
      if (fields[field]) {
        delete (pkg.json as any)[field];
      }
    });
  } else {
    keys(fields)
      .filter((x) => fields[x])
      .forEach((field) => {
        pkg.setFieldOnEntrypoints(field);
      });
  }

  pkg.json = setFieldInOrder(pkg.json, "exports", exportsField(pkg));

  for (const entrypoint of pkg.entrypoints) {
    if (
      entrypoint.json["umd:main"] !== undefined &&
      !isUmdNameSpecified(entrypoint)
    ) {
      let umdName = await promptInput(inputs.getUmdName, entrypoint);
      entrypoint.json.preconstruct.umdName = umdName;
    }
  }

  return async () =>
    (
      await Promise.all([
        pkg.save(),
        ...(pkg.isTypeModule()
          ? []
          : pkg.entrypoints.map((x) =>
              x.directory !== pkg.directory ? x.save() : false
            )),
      ])
    ).some((x) => x);
}

export default async function fix(directory: string) {
  let project = await Project.create(directory, true);
  let didModifyProject = false;
  if (project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH) {
    let errors: FatalError[] = [];
    Object.keys(
      project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH
    ).forEach((key) => {
      if (FORMER_FLAGS_THAT_ARE_ENABLED_NOW.has(key)) {
        didModifyProject = true;
        delete (project.json.preconstruct
          .___experimentalFlags_WILL_CHANGE_IN_PATCH as any)[key];
      } else if (!EXPERIMENTAL_FLAGS.has(key)) {
        errors.push(
          new FatalError(
            `The experimental flag ${JSON.stringify(
              key
            )} in your config does not exist`,
            project.name
          )
        );
      }
    });
    if (didModifyProject) {
      if (
        Object.keys(
          project.json.preconstruct.___experimentalFlags_WILL_CHANGE_IN_PATCH
        ).length === 0
      ) {
        delete (project.json.preconstruct as any)
          .___experimentalFlags_WILL_CHANGE_IN_PATCH;
      }
      await project.save();
    }
    if (errors.length) {
      throw new BatchError(errors);
    }
  }

  const updaters = await Promise.all(project.packages.map(fixPackage));

  const didModifyPackages = (await Promise.all(updaters.map((x) => x()))).some(
    (x) => x
  );

  logger.success(
    didModifyProject || didModifyPackages
      ? "fixed project!"
      : "project already valid!"
  );
}
