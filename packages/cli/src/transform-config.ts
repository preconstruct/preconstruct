import { FatalError } from "./errors";
import { JSONValue } from "./utils";

export type TransformConfig =
  | { type: "babel" }
  | { type: "oxc"; target?: string | string[] };

function invalidTransform(message: string, scope: string): never {
  throw new FatalError(`the "preconstruct.transform" field ${message}`, scope);
}

export function parseTransformConfig(
  value: JSONValue | undefined,
  scope: string
): TransformConfig {
  if (value === undefined) return { type: "oxc" };
  if (value === "babel" || value === "oxc") return { type: value };
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidTransform(
      'must be "babel", "oxc", or a transform configuration object',
      scope
    );
  }

  const keys = Object.keys(value);
  for (const key of keys) {
    if (key !== "type" && key !== "target") {
      return invalidTransform(
        `contains an unknown key ${JSON.stringify(key)}`,
        scope
      );
    }
  }
  if (value.type !== "babel" && value.type !== "oxc") {
    return invalidTransform('must have a "type" of "babel" or "oxc"', scope);
  }
  if (value.type === "babel") {
    if ("target" in value) {
      return invalidTransform(
        'cannot specify "target" when its type is "babel"',
        scope
      );
    }
    return { type: "babel" };
  }
  if (value.target === undefined) return { type: "oxc" };
  const target = value.target;
  if (
    !(
      (typeof target === "string" && target.length > 0) ||
      (Array.isArray(target) &&
        target.length > 0 &&
        target.every((item) => typeof item === "string" && item.length > 0))
    )
  ) {
    return invalidTransform(
      'must have a non-empty string or array of non-empty strings for "target"',
      scope
    );
  }
  return { type: "oxc", target: target as string | string[] };
}
