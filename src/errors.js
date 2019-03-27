// @flow

/*::
import type { ItemUnion } from './types'
*/

export class FatalError extends Error {
  item: ItemUnion;
  constructor(message: string, item: ItemUnion) {
    super(message);
    this.item = item;
  }
}

export class ValidationError extends Error {}

export class MissingDependency extends Error {}

export class FixableError extends Error {
  item: ItemUnion;
  fixer: () => Promise<void>;
  constructor(message: string, item: ItemUnion, fixer: () => Promise<void>) {
    super(message);
    this.item = item;
    this.fixer = fixer;
  }
}
