import { parseTransformConfig } from "./transform-config";
import { Project } from "./project";
import { testdir } from "../test-utils";

test("defaults to Oxc and supports shorthand", () => {
  expect(parseTransformConfig(undefined, "pkg")).toEqual({ type: "oxc" });
  expect(parseTransformConfig("oxc", "pkg")).toEqual({ type: "oxc" });
  expect(parseTransformConfig("babel", "pkg")).toEqual({ type: "babel" });
});

test("supports Oxc target strings and arrays", () => {
  expect(
    parseTransformConfig({ type: "oxc", target: "es2020" }, "pkg")
  ).toEqual({ type: "oxc", target: "es2020" });
  expect(
    parseTransformConfig({ type: "oxc", target: ["es2020", "node18"] }, "pkg")
  ).toEqual({ type: "oxc", target: ["es2020", "node18"] });
});

test.each([
  ["swc", 'must be "babel", "oxc", or a transform configuration object'],
  [{ type: "swc" }, 'must have a "type" of "babel" or "oxc"'],
  [{ type: "babel", target: "es2020" }, 'cannot specify "target"'],
  [{ type: "oxc", target: [] }, "must have a non-empty string"],
  [{ type: "oxc", typo: true }, 'contains an unknown key "typo"'],
] as const)("rejects invalid transform config %#", (config, message) => {
  expect(() => parseTransformConfig(config as any, "pkg")).toThrow(message);
});

test("package transform config completely replaces the project config", async () => {
  const dir = await testdir({
    "package.json": JSON.stringify({
      name: "root",
      preconstruct: {
        packages: ["packages/*"],
        transform: { type: "oxc", target: "es2019" },
      },
    }),
    "packages/inherited/package.json": JSON.stringify({ name: "inherited" }),
    "packages/inherited/src/index.js": "export {};",
    "packages/replaced/package.json": JSON.stringify({
      name: "replaced",
      preconstruct: { transform: "oxc" },
    }),
    "packages/replaced/src/index.js": "export {};",
  });
  const project = await Project.create(dir);

  expect(
    project.packages.find((pkg) => pkg.name === "inherited")!.configTransform
  ).toEqual({ type: "oxc", target: "es2019" });
  expect(
    project.packages.find((pkg) => pkg.name === "replaced")!.configTransform
  ).toEqual({ type: "oxc" });
});
