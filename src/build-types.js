// @flow

export type BuildType = "required" | "prompted" | "optional";

export type FieldType = "single" | "mapping";

type SingleField = {
  name: string,
  type: "single",
  suffix: string
};

type Field =
  | SingleField
  | {
      name: string,
      type: "mapping",
      suffix: string,
      bases: Array<SingleField>
    };

type BaseBuild = {
  field: Field,
  getValid: (pkgName: string) => { [key: string]: string } | string
};

type BasePromptBuild = BaseBuild & { prompt: string };

type RequiredBuild = BasePromptBuild & {
  type: "required"
};

type PromptedBuild = BasePromptBuild & {
  type: "prompted"
};

type OptionalBuild = BaseBuild & {
  type: "optional"
};

export type Build = RequiredBuild | PromptedBuild | OptionalBuild;

export let builds: Array<Build> = [
  {
    field: "main",
    type: "required",
    getValid: pkgName => {
      return `${pkgName}.`;
    },
    prompt: ""
  }
];
