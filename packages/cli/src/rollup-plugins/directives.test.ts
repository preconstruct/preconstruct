import assert from "node:assert/strict";
import { Directive, getModuleDirectives } from "./directives";

function remove(str: string, directive: Directive) {
  return str.slice(0, directive.start) + str.slice(directive.end);
}

test("basic", () => {
  const input = `"use strict";blah`;
  const result = getModuleDirectives(input);
  assert.deepEqual(result, [{ value: "use strict", start: 0, end: 13 }]);
  assert.deepEqual(remove(input, result[0]).toString(), "blah");
});

test("without semi", () => {
  const input = `"use strict"\nblah`;
  const result = getModuleDirectives(input);
  assert.deepEqual(result, [{ value: "use strict", start: 0, end: 12 }]);
  assert.deepEqual(remove(input, result[0]).toString(), "\nblah");
});

test("escaped directive then real directive", () => {
  const input = `'use \\'client';'use client';blah`;
  const result = getModuleDirectives(input);
  assert.deepEqual(result, [
    { end: 15, start: 0, value: "use \\'client" },
    { end: 28, start: 15, value: "use client" },
  ]);
  assert.deepEqual(remove(input, result[0]).toString(), "'use client';blah");
  assert.deepEqual(remove(input, result[1]).toString(), "'use \\'client';blah");
});

test("block comments", () => {
  const input = `/** @jsx jsx\n */\n'use client';blah`;
  const result = getModuleDirectives(input);
  assert.deepEqual(result, [{ value: "use client", start: 17, end: 30 }]);
  assert.deepEqual(
    remove(input, result[0]).toString(),
    `/** @jsx jsx\n */\nblah`
  );
});

test("line comments", () => {
  const input = `// something\n'use client';blah`;
  const result = getModuleDirectives(input);
  assert.deepEqual(result, [{ value: "use client", start: 13, end: 26 }]);
  assert.deepEqual(remove(input, result[0]).toString(), `// something\nblah`);
});
