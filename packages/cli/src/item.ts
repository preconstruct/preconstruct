import * as fs from "fs-extra";
import nodePath from "path";
import detectIndent from "detect-indent";
import parseJson from "parse-json";
import { JSONValue } from "./utils";

let itemsByPath: { [key: string]: Set<Item> } = {};

type BaseConfig = Record<string, JSONValue | undefined> & {
  preconstruct: JSONValue;
};

export class Item<JSONData extends BaseConfig = BaseConfig> {
  _contents: string;
  _stringifiedSavedJson: string;
  path: string;
  directory: string;

  json: JSONData;
  constructor(filePath: string, contents: string) {
    this.json = parseJson(contents, filePath);
    this._stringifiedSavedJson = JSON.stringify(this.json, null, 2);
    if (!this.json.preconstruct) {
      this.json.preconstruct = {};
    }

    this._contents = contents;
    this.path = filePath;
    this.directory = nodePath.dirname(filePath);
    if (itemsByPath[this.path] === undefined) {
      itemsByPath[this.path] = new Set();
    }
    itemsByPath[this.path].add(this);
  }

  updater(json: JSONData) {
    this.json = json;
  }

  async refresh() {
    let contents: string = await fs.readFile(this.path, "utf-8");
    let json = parseJson(contents, this.path);
    for (let item of itemsByPath[this.path]) {
      item.updater(json);
    }
  }
  async save() {
    const json = { ...this.json };
    if (
      json.preconstruct &&
      json.preconstruct !== null &&
      typeof json.preconstruct === "object" &&
      !Object.keys(json.preconstruct).length
    ) {
      delete json.preconstruct;
    }
    let stringified = JSON.stringify(json, null, 2);
    if (stringified !== this._stringifiedSavedJson) {
      await fs.writeFile(
        this.path,
        JSON.stringify(
          json,
          null,
          detectIndent(this._contents).indent || "  "
        ) + "\n"
      );

      for (let item of itemsByPath[this.path]) {
        item.updater(this.json);
      }
      this._stringifiedSavedJson = stringified;
      return true;
    }

    return false;
  }
}
