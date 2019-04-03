// @flow
import { readFileSync } from "fs";
import * as fs from "fs-extra";
import _globby from "globby";

type Resync<Return> = {
  sync: () => Return,
  async: () => Promise<Return>
};

export function resync<Return>(
  resync: Resync<Return>
): Generator<any, Return, any> {
  return (function*() {
    let val = yield resync;
    return val;
  })();
}

export let desyncs = {
  readFile: (filename: string, encoding: string) =>
    resync({
      sync: () => readFileSync(filename, encoding),
      async: () => fs.readFile(filename, encoding)
    }),
  globby: (globs: string | Array<string>, options: Object) =>
    resync({
      sync: () => _globby.sync(globs, options),
      async: () => _globby(globs, options)
    })
};

export function desync<Args: $ReadOnlyArray<mixed>, Return>(
  fn: (...Args) => Generator<any, Return, any>
): (...Args) => Resync<Return> {
  return (...args) => ({
    sync: () => {
      let gen = fn(...args);
      let current = gen.next();
      while (!current.done) {
        current = gen.next(current.value.sync());
      }
      // $FlowFixMe
      return current.value;
    },
    async: async () => {
      let gen = fn(...args);
      let current = gen.next();
      while (!current.done) {
        current = gen.next(await current.value.async());
      }
      // $FlowFixMe
      return current.value;
    }
  });
}
