// @flow

/*::
import type { ItemUnion } from './types'
*/

export class FatalError extends Error {
  item: ItemUnion;
  constructor(message: string, item: ItemUnion) {
    super(message);
    this.item = item;
    if (process.env.NODE_ENV === "test") {
      let { getItemType } = require("./utils");
      this.message = `${this.message} in ${getItemType(item)} ${item.name}`;
    }
  }
}

export class ValidationError extends Error {}

export class MissingDependency extends Error {}
