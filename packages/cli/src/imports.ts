import { z } from "zod";

// we're disallowing the array syntax because there's literally no reason to use it
// for `imports` when it's going to be compiled away in what people import
// (if people think they want it, they're almost always wrong because it doesn't do what they think it does)
const conditionsSchema: z.ZodType<WrittenConditions> = z.lazy(() =>
  z.union([z.string(), z.null(), z.record(conditionsSchema)])
);

const importsSchema = z
  .record(z.string().startsWith("#"), conditionsSchema)
  .default({});

type WrittenConditions =
  | null
  | string
  | { [condition: string]: WrittenConditions };

type Imports = { [specifier: string]: WrittenConditions };

function getAllConditions(imports: Imports) {
  const allConditions = new Set<string>();
  for (const conditions of Object.values(imports)) {
    findConditions(conditions, allConditions);
  }

  return [...allConditions].sort();
}

export function parseImportsField(input: unknown) {
  const parsed = importsSchema.parse(input);

  const sortedConditions = getAllConditions(parsed);

  const resolvedToConditions = new Map<string, [string[], ...string[][]]>();
  for (const combination of getCombinations(sortedConditions)) {
    const resolved = Object.entries(parsed).map(([specifier, conditions]) => {
      const resolved = resolveConditions(conditions, combination);
      if (resolved === null) {
        throw new Error(`imports.${specifier} is missing a default`);
      }
      return resolved;
    });
    const resolvedString = JSON.stringify(resolved);
    if (!resolvedToConditions.has(resolvedString)) {
      resolvedToConditions.set(resolvedString, [combination]);
      continue;
    }
    resolvedToConditions.get(resolvedString)!.push(combination);
  }

  const buildToCombinations = new Map(
    [...resolvedToConditions.values()].map((combinations) => {
      let shortestCombination = combinations[0];
      for (const combination of combinations) {
        if (combination.length < shortestCombination.length) {
          shortestCombination = combination;
        }
      }
      return [shortestCombination, combinations];
    })
  );

  return buildToCombinations;
}

type Exports<Leaf> = Leaf | { [specifier: string]: Exports<Leaf> };

export function createExportsField<Leaf>(
  buildToCombinations: Map<string[], [string[], ...string[][]]>,
  toLeaf: (conditions: string[]) => Leaf
) {
  const combinationsToBuild = new Map<string, Leaf>();
  const conditionsToBuildCount = new Map<string, number>();
  const conditionsToInBuildCount = new Map<string, number>();

  for (const [build, combinations] of buildToCombinations) {
    for (const condition of new Set(combinations.flat())) {
      conditionsToInBuildCount.set(
        condition,
        (conditionsToInBuildCount.get(condition) ?? 0) + 1
      );
    }
    for (const condition of new Set(build)) {
      conditionsToBuildCount.set(
        condition,
        (conditionsToBuildCount.get(condition) ?? 0) + 1
      );
    }
    const leaf = toLeaf(build);
    for (const combination of combinations) {
      combinationsToBuild.set(JSON.stringify(combination), leaf);
    }
  }

  // i'm not totally sure if this is right or the best way to do this
  // but it seems to work i think
  const conditionsInExportsFieldOrder = [...conditionsToInBuildCount.keys()]
    .sort()
    .sort((a, b) => {
      const aBuildVsInDiff =
        (conditionsToBuildCount.get(a) ?? 0) -
        (conditionsToInBuildCount.get(a) ?? 0);
      const bBuildVsInDiff =
        (conditionsToBuildCount.get(b) ?? 0) -
        (conditionsToInBuildCount.get(b) ?? 0);
      if (aBuildVsInDiff === 0 && bBuildVsInDiff === 0) {
        return (
          (conditionsToBuildCount.get(b) ?? 0) -
          (conditionsToBuildCount.get(a) ?? 0)
        );
      }
      return (
        (conditionsToInBuildCount.get(a) ?? 0) -
        (conditionsToInBuildCount.get(b) ?? 0)
      );
    });
  return _createExportsField(
    conditionsInExportsFieldOrder,
    [],
    combinationsToBuild
  );
}

function _createExportsField<Leaf>(
  combinationsLeft: string[],
  parentCombinations: string[],
  combinationToBuild: Map<string, Leaf>
): Exports<Leaf> {
  if (combinationsLeft.length === 0) {
    const build = combinationToBuild.get(
      JSON.stringify([...parentCombinations].sort())
    );
    if (!build) {
      throw new Error("missing build");
    }
    return build;
  }
  const [currentCondition, ...rest] = combinationsLeft;
  const withCurrent = _createExportsField(
    rest,
    [...parentCombinations, currentCondition],
    combinationToBuild
  );
  const withoutCurrent = _createExportsField(
    rest,
    parentCombinations,
    combinationToBuild
  );
  if (withCurrent === withoutCurrent) {
    return withCurrent;
  }
  if (
    typeof withoutCurrent !== "object" ||
    Array.isArray(withoutCurrent) ||
    withoutCurrent === null
  ) {
    return {
      [currentCondition]: withCurrent,
      default: withoutCurrent,
    };
  }
  return {
    [currentCondition]: withCurrent,
    ...withoutCurrent,
  };
}

function resolveConditions(
  written: WrittenConditions,
  combination: string[]
): string | undefined | null {
  if (typeof written === "string" || written === null) {
    return written;
  }
  for (const [condition, value] of Object.entries(written)) {
    if (condition === "default" || combination.includes(condition)) {
      const resolved = resolveConditions(value, combination);
      if (resolved !== undefined) return resolved;
    }
  }
  return undefined;
}

const bannedConditions = new Set(["import", "require", "module", "types"]);

function findConditions(specified: WrittenConditions, conditions: Set<string>) {
  if (typeof specified === "string" || specified === null) {
    return;
  }

  for (const [condition, value] of Object.entries(specified)) {
    if (bannedConditions.has(condition) || condition.startsWith("types@")) {
      throw new Error(
        `condition ${condition} is not allowed in the imports field with preconstruct`
      );
    }
    if (condition === "default") {
      findConditions(value, conditions);
      continue;
    }
    conditions.add(condition);
    findConditions(value, conditions);
  }
}

function getCombinations<T>(arr: T[]): T[][] {
  const result: T[][] = [[]];

  for (const item of arr) {
    const currentLength = result.length;
    for (let i = 0; i < currentLength; i++) {
      const currentCombination = result[i];
      result.push([...currentCombination, item]);
    }
  }

  return result;
}
