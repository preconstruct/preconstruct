import util from "util";
import { format } from "./logger";
export class FatalError extends Error {
  scope: string;
  constructor(message: string, scope: string) {
    super(message);
    this.scope = scope;
  }
}

export class BatchError extends Error {
  errors: FatalError[];
  constructor(errors: FatalError[]) {
    super(
      errors
        .map(x => {
          debugger;
          return format([x.message], "none", x.scope);
        })
        .join("\n")
    );
    this.errors = errors;
  }
}

export class ScopelessError extends Error {}

export class UnexpectedBuildError extends FatalError {
  constructor(error: Error, pkgName: string) {
    super(`${util.format("", error).trim()}`, pkgName);
  }
}

export class FixableError extends FatalError {}
