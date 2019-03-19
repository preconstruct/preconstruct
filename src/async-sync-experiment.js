// @flow
import { readFileSync } from "fs";
import * as fs from "fs-extra";

type Resync<Args, Return> = (...Args) => Generator<any, Return, any>;

function wrap<Return, Arg, Args: $ReadOnlyArray<Arg>>(
  fn: (
    ...Args
  ) => {
    sync: () => Return,
    async: () => Promise<Return>
  }
): Resync<Args, Return> {
  return function*(...args: Args): Generator<any, Return, any> {
    let val = yield fn(...args);
    return val;
  };
}

let readFile: Resync<[string], string> = wrap(filename => ({
  sync: () => readFileSync(filename, "utf8"),
  async: () => fs.readFile(filename, "utf8")
}));

function* doAThing() {
  let myFileContents = yield* readFile("filename");
  return myFileContents;
}

function desync(fn) {
  return {
    sync: (...args) => {
      let gen = fn(...args);
      let current = gen.next();
      while (!current.done) {
        current = gen.next(current.value.sync());
      }
      return current.value;
    },
    async: async (...args) => {
      let gen = fn(...args);
      let current = gen.next();
      while (!current.done) {
        current = gen.next(await current.value.async());
      }
      return current.value;
    }
  };
}

let converted = desync(doAThing);

console.log(converted.sync());

converted.async().then(x => console.log(x));
