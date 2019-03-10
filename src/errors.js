// @flow

/*::
import { Package } from './package'
import { Entrypoint } from './entrypoint'

*/

export class FatalError extends Error {
  package: Package;
  constructor(message: string, pkg: Package | Entrypoint) {
    super(message);
    this.package = pkg;
  }
}

export class ValidationError extends Error {}

export class MissingDependency extends Error {}

export class MissingEntrypoint extends Error {}
