import normalizePath from "normalize-path";
import { Entrypoint, ExportsConditions } from "./entrypoint";
import { Package } from "./package";
import * as nodePath from "path";
import { FatalError } from "./errors";

export function getNameForDistForEntrypoint(entrypoint: Entrypoint): string {
  return getDistName(entrypoint.package, entrypoint.name);
}

let fields = [
  "version",
  "description",
  "main",
  "module",
  "umd:main",
  "browser",
  "exports",
];

export function setFieldInOrder<
  Obj extends { [key: string]: any },
  Key extends "main" | "module" | "umd:main" | "browser" | "exports",
  Val extends any
>(obj: Obj, field: Key, value: Val): Obj & { [k in Key]: Val } {
  if (field in obj) {
    let newObj = { ...obj };
    (newObj as any)[field] = value;
    return newObj;
  }
  let fieldIndex = fields.indexOf(field);
  let idealField = fields
    .slice(0, fieldIndex)
    .reverse()
    .find((key) => {
      return key in obj;
    });

  if (idealField === undefined) {
    return { ...obj, [field]: value };
  }

  let newObj: { [key: string]: any } = {};

  for (let key in obj) {
    newObj[key] = obj[key];

    if (key === idealField) {
      newObj[field] = value;
    }
  }

  return newObj as any;
}

export function getEntrypointName(pkg: Package, entrypointDir: string) {
  return normalizePath(
    nodePath.join(
      pkg.name,
      nodePath.relative(
        pkg.directory,
        nodePath.resolve(pkg.directory, entrypointDir)
      )
    )
  );
}

type DistFilenameStrategy = "full" | "unscoped-package-name";

function getDistNameWithStrategy(
  pkg: Package,
  entrypointName: string,
  strategy: DistFilenameStrategy
) {
  if (strategy === "full") {
    return entrypointName.replace("@", "").replace(/\//g, "-");
  }
  return pkg.name.replace(/.*\//, "");
}

function getDistName(
  pkg: Package,
  entrypointName: string,
  forceStrategy?: DistFilenameStrategy
): string {
  if (forceStrategy) {
    return getDistNameWithStrategy(pkg, entrypointName, forceStrategy);
  }
  if ("distFilenameStrategy" in pkg.project.json.preconstruct) {
    if (
      pkg.project.json.preconstruct.distFilenameStrategy !== "full" &&
      pkg.project.json.preconstruct.distFilenameStrategy !==
        "unscoped-package-name"
    ) {
      throw new FatalError(
        `distFilenameStrategy is defined in your Preconstruct config as ${JSON.stringify(
          pkg.project.json.preconstruct.distFilenameStrategy
        )} but the only accepted values are "full" and "unscoped-package-name"`,
        pkg.project.name
      );
    }
    if (
      pkg.project.json.preconstruct.distFilenameStrategy ===
      "unscoped-package-name"
    ) {
      return getDistNameWithStrategy(
        pkg,
        entrypointName,
        "unscoped-package-name"
      );
    }
  }
  return getDistNameWithStrategy(pkg, entrypointName, "full");
}

export const validFieldsFromPkg = {
  main(
    pkg: Package,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);
    return `dist/${safeName}.cjs.js`;
  },
  module(
    pkg: Package,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);
    return `dist/${safeName}.esm.js`;
  },
  "umd:main"(
    pkg: Package,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);
    return `dist/${safeName}.umd.min.js`;
  },
  browser(
    pkg: Package,
    hasModuleBuild: boolean,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);

    let obj = {
      [`./dist/${safeName}.cjs.js`]: `./dist/${safeName}.browser.cjs.js`,
    };
    if (hasModuleBuild) {
      obj[`./dist/${safeName}.esm.js`] = `./dist/${safeName}.browser.esm.js`;
    }
    return obj;
  },
  exports(
    pkg: Package,
    hasModuleBuild: boolean,
    hasBrowserField: boolean,
    hasWorkerField: boolean,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy
  ): Record<string, ExportsConditions | string> {
    let output: Record<string, ExportsConditions> = {};
    let obj: ExportsConditions = exportsHelpers.root(
      pkg,
      hasModuleBuild,
      entrypointName,
      forceStrategy
    );
    if (hasBrowserField) {
      obj = {
        browser: exportsHelpers.target(
          pkg,
          hasModuleBuild,
          entrypointName,
          forceStrategy,
          "browser"
        ),
        ...obj,
      };
    }
    if (hasWorkerField) {
      obj = {
        worker: exportsHelpers.target(
          pkg,
          hasModuleBuild,
          entrypointName,
          forceStrategy,
          "worker"
        ),
        ...obj,
      };
    }
    output["."] = obj;
    pkg.entrypoints.forEach((entrypoint) => {
      if (entrypointName === entrypoint.name) {
        return;
      }
      const entrypointPath = nodePath
        .relative(pkg.directory, entrypoint.source)
        .replace("src/", "")
        .replace(/\.[tj]sx?$/, "");

      let conditions: ExportsConditions = exportsHelpers.root(
        pkg,
        entrypoint.json.module !== undefined,
        entrypoint.name,
        forceStrategy,
        entrypointPath + "/"
      );

      if (hasBrowserField) {
        conditions = {
          browser: exportsHelpers.target(
            pkg,
            hasModuleBuild,
            entrypoint.name,
            forceStrategy,
            "browser",
            entrypointPath + "/"
          ),
          ...conditions,
        };
      }
      if (hasWorkerField) {
        conditions = {
          worker: exportsHelpers.target(
            pkg,
            hasModuleBuild,
            entrypoint.name,
            forceStrategy,
            "worker",
            entrypointPath + "/"
          ),
          ...conditions,
        };
      }
      output[`./${entrypointPath}`] = conditions;
    });
    return {
      "./package.json": "./package.json",
      ...output,
      "./": "./",
    };
  },
};

const exportsHelpers = {
  root(
    pkg: Package,
    hasModuleBuild: boolean,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy,
    prefix: string = ""
  ) {
    return exportsHelpers.target(
      pkg,
      hasModuleBuild,
      entrypointName,
      forceStrategy,
      "",
      prefix
    );
  },
  target(
    pkg: Package,
    hasModuleBuild: boolean,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy,
    target: string = "",
    prefix: string = ""
  ) {
    const obj = exportsHelpers.env(
      pkg,
      hasModuleBuild,
      entrypointName,
      forceStrategy,
      "",
      target,
      prefix
    );
    const production = exportsHelpers.env(
      pkg,
      hasModuleBuild,
      entrypointName,
      forceStrategy,
      "prod",
      target,
      prefix
    );
    const development = exportsHelpers.env(
      pkg,
      hasModuleBuild,
      entrypointName,
      forceStrategy,
      "dev",
      target,
      prefix
    );
    return {
      production,
      development,
      ...obj,
    };
  },
  env(
    pkg: Package,
    hasModuleBuild: boolean,
    entrypointName: string,
    forceStrategy?: DistFilenameStrategy,
    env: string = "",
    target: string = "",
    prefix: string = ""
  ) {
    let safeName = getDistName(pkg, entrypointName, forceStrategy);

    let obj: ExportsConditions = {
      default: `./${prefix}dist/${safeName}.${target ? `${target}.` : ""}cjs.${
        env ? `${env}.` : ""
      }js`,
    };
    if (hasModuleBuild) {
      obj = {
        module: `./${prefix}dist/${safeName}.${target ? `${target}.` : ""}esm.${
          env ? `${env}.` : ""
        }js`,
        ...obj,
      };
    }
    return obj;
  },
};

export const validFields = {
  main(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg.main(
      entrypoint.package,
      entrypoint.name,
      forceStrategy
    );
  },
  module(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg.module(
      entrypoint.package,
      entrypoint.name,
      forceStrategy
    );
  },
  "umd:main"(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg["umd:main"](
      entrypoint.package,
      entrypoint.name,
      forceStrategy
    );
  },
  browser(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    return validFieldsFromPkg.browser(
      entrypoint.package,
      entrypoint.json.module !== undefined,
      entrypoint.name,
      forceStrategy
    );
  },
  exports(entrypoint: Entrypoint, forceStrategy?: DistFilenameStrategy) {
    if (typeof entrypoint.json.exports === "undefined") {
      return;
    }
    const conditions = Object.values(entrypoint.json.exports);
    const hasBrowserField = conditions.some(
      (condition) =>
        typeof condition === "object" && condition.browser !== undefined
    );
    const hasWorkerField = conditions.some(
      (condition) =>
        typeof condition === "object" && condition.worker !== undefined
    );
    return validFieldsFromPkg.exports(
      entrypoint.package,
      entrypoint.json.module !== undefined,
      hasBrowserField,
      hasWorkerField,
      entrypoint.name,
      forceStrategy
    );
  },
};

export function flowTemplate(hasDefaultExport: boolean, relativePath: string) {
  const escapedPath = JSON.stringify(relativePath);
  return `// @flow
export * from ${escapedPath};${
    hasDefaultExport ? `\nexport { default } from ${escapedPath};` : ""
  }\n`;
}

export function tsTemplate(hasDefaultExport: boolean, relativePath: string) {
  const escapedPath = JSON.stringify(relativePath);
  return `export * from ${escapedPath};${
    hasDefaultExport ? `\nexport { default } from ${escapedPath};` : ""
  }\n`;
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | Array<JSONValue>
  | { [key: string]: JSONValue | undefined };
