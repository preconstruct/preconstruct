// @flow

/*::
import { Package } from './package'
*/

export class FatalError extends Error {
  package: Package;
  constructor(message: string, pkg: Package) {
    super(message);
    this.package = pkg;
  }
}

export class ValidationError extends Error {}

export class MissingDependency extends Error {}
