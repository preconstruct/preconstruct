import { Directive, getModuleDirectives } from "./directives";

function remove(str: string, directive: Directive) {
  return str.slice(0, directive.start) + str.slice(directive.end);
}

test("basic", () => {
  const input = `"use strict";blah`;
  const result = getModuleDirectives(input);
  expect(result).toEqual([{ value: "use strict", start: 0, end: 13 }]);
  expect(remove(input, result[0]).toString()).toEqual("blah");
});

test("without semi", () => {
  const input = `"use strict"\nblah`;
  const result = getModuleDirectives(input);
  expect(result).toEqual([{ value: "use strict", start: 0, end: 12 }]);
  expect(remove(input, result[0]).toString()).toEqual("\nblah");
});

test("escaped directive then real directive", () => {
  const input = `'use \\'client';'use client';blah`;
  const result = getModuleDirectives(input);
  expect(result).toEqual([
    { end: 15, start: 0, value: "use \\'client" },
    { end: 28, start: 15, value: "use client" },
  ]);
  expect(remove(input, result[0]).toString()).toEqual("'use client';blah");
  expect(remove(input, result[1]).toString()).toEqual("'use \\'client';blah");
});

test("block comments", () => {
  const input = `/** @jsx jsx\n */\n'use client';blah`;
  const result = getModuleDirectives(input);
  expect(result).toEqual([{ value: "use client", start: 17, end: 30 }]);
  expect(remove(input, result[0]).toString()).toEqual(
    `/** @jsx jsx\n */\nblah`
  );
});

test("line comments", () => {
  const input = `// something\n'use client';blah`;
  const result = getModuleDirectives(input);
  expect(result).toEqual([{ value: "use client", start: 13, end: 26 }]);
  expect(remove(input, result[0]).toString()).toEqual(`// something\nblah`);
});
