// @flow strict
import { readFileSync } from "fs";
import * as fs from "fs-extra";
import _globby from "globby";

export type Resync<Return> = {
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

export let resyncs = {
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

type Extract = <Value>(resync: Resync<Value>) => Value;

export function all<Resyncs: $ReadOnlyArray<Resync<mixed>>>(
  resyncs: Resyncs
): Generator<any, $TupleMap<Resyncs, Extract>, any> {
  return resync({
    sync: () => {
      return resyncs.map(resync => resync.sync());
    },
    async: () => {
      return Promise.all(resyncs.map(resync => resync.async()));
    }
  });
}

export function desync<Return>(
  fn: () => Generator<any, Return, any>
): Resync<Return> {
  return {
    sync: (): Return => {
      let gen = fn();
      let current = gen.next();
      while (!current.done) {
        current = gen.next(current.value.sync());
      }
      return ((current.value: any): Return);
    },
    async: async (): Promise<Return> => {
      let gen = fn();
      let current = gen.next();
      while (!current.done) {
        current = gen.next(await current.value.async());
      }
      return ((current.value: any): Return);
    }
  };
}
