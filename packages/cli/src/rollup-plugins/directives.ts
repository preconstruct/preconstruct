const whitespace = /\s/;

type Directive = {
  value: string;
  start: number;
  end: number;
};

export function getModuleDirectives(source: string): Directive[] {
  let lastDirectiveExpectingSemi: Directive | undefined;
  const directives: Directive[] = [];
  outer: for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (whitespace.test(char)) {
      continue;
    }
    if (char === "/") {
      if (source[i + 1] === "/") {
        i += 2;
        while (
          i < source.length &&
          (source[i] !== "\r" || source[i] !== "\n")
        ) {
          i++;
        }
      }
      if (source[i + 1] === "*") {
        i += 2;
        while (
          i < source.length &&
          (source[i] !== "*" || source[i + 1] !== "/")
        ) {
          i++;
        }
        i += 2;
      }
    }
    if (char === ";" && lastDirectiveExpectingSemi !== undefined) {
      lastDirectiveExpectingSemi.end = i + 1;
      lastDirectiveExpectingSemi = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      let start = i;
      i++;
      while (source[i] !== char) {
        if (i >= source.length) break outer;

        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        i++;
      }
      const value = source.slice(start + 1, i);
      const directive = { value, start, end: i + 1 };
      directives.push(directive);
      lastDirectiveExpectingSemi = directive;
      continue;
    }
    break;
  }
  return directives;
}
