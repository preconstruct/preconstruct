// @flow
// wanted to make a tree view of a directory with the contents of the files
// for testing but gonna finish it later
// based on https://github.com/egoist/tre/blob/master/src/index.js
import * as fs from "fs-extra";
import path from "path";

const CHARS = {
  continue: "├──",
  end: "└──",
  line: "│"
};

function repeat(char, count) {
  let res = "";
  while (count--) {
    res += char;
  }
  return res;
}

async function getData(
  directory: string,
  depth: number,
  items: Array<{ type: "file" | "directory", depth: number, name: string }>
) {
  let dir = await fs.readdir(directory);

  // this should probably happen in parallel but not sure how to make ordering good

  for (let item of dir) {
    let joined = path.join(directory, item);
    let stats = await fs.stat(joined);
    if (stats.isDirectory()) {
      items.push();
      await getData(joined, depth + 1, items);
    } else if (stats.isFile()) {
      // items.push({});
    } else {
      throw new Error("unknown thing");
    }
  }

  return items;
}

export default async function printDirectory(directory: string) {
  let data = [];
  await getData(directory, 0, data);

  return (
    `.\n` +
    data
      .map((item, index) => {
        const isLast = index === data.length - 1;
        const next = !isLast && data[index + 1];
        const char =
          next && next.depth === item.depth ? CHARS.continue : CHARS.end;
        const linePrefix = item.depth > 0 && !isLast ? CHARS.line : "";
        const prefix = `${linePrefix}${repeat(
          " ",
          item.depth === 0 ? 0 : 3 + (item.depth - 1) * 4 + (linePrefix ? 0 : 1)
        )}${char}`;

        return `${prefix} ${item.name}`;
      })
      .join("\n")
  );
}
