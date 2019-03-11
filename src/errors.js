// @flow

/*::
import type { ItemUnion } from './types'
*/

export class FatalError extends Error {
  item: ItemUnion;
  constructor(message: string, item: Item) {
    super(message);
    this.item = item;
  }
}

export class ValidationError extends Error {}

export class MissingDependency extends Error {}
