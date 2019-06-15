// @flow
import util from "util";

export class FatalError extends Error {
  scope: string;
  constructor(message: string, scope: string) {
    super(message);
    this.scope = scope;
  }
}

export class UnexpectedBuildError extends FatalError {
  constructor(error: Error, pkgName: string) {
    super(`${util.format("", error).trim()}`, pkgName);
  }
}

export class ValidationError extends Error {}

export class MissingDependency extends Error {}

export class FixableError extends FatalError {}
