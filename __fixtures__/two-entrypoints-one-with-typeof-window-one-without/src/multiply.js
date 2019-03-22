export let multiply =
  typeof window === "undefined" ? (a, b) => a * b : (a, b) => a * b;

export { something } from "./other";
