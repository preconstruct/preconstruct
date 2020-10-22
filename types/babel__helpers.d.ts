declare module "@babel/helpers" {
  import { types } from "@babel/core";

  export const list: string[];
  export function ensure(name: string): void;
  export function getDependencies(name: string): readonly string[];
  export function minVersion(name: string): string;
  export function get(
    name: string,
    getDependency?: (name: string) => types.Expression
  ): { nodes: types.Statement[] };
}
