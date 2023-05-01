const whitespace = /\s/;

export type Directive = {
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
      i++;
      if (source[i] === "/") {
        while (i < source.length && source[i] !== "\r" && source[i] !== "\n") {
          i++;
        }
        continue;
      }
      if (source[i] === "*") {
        while (
          i < source.length &&
          (source[i] !== "*" || source[i + 1] !== "/")
        ) {
          i++;
        }
        i += 1;
        continue;
      }
      break;
    }
    if (char === ";") {
      if (lastDirectiveExpectingSemi !== undefined) {
        lastDirectiveExpectingSemi.end = i + 1;
        lastDirectiveExpectingSemi = undefined;
        continue;
      }
      break;
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
