import * as fs from "fs-extra";
import nodePath from "path";
import detectIndent from "detect-indent";
import parseJson from "parse-json";
import { PKG_JSON_CONFIG_FIELD } from "./constants";

let itemsByPath: { [key: string]: Set<Item> } = {};

export class Item {
  _contents: string;
  _stringifiedSavedJson: string;
  path: string;
  directory: string;

  json: Record<string, any>;
  _config: Record<string, any>;
  constructor(filePath: string, contents: string) {
    this.json = parseJson(contents, filePath);
    this._stringifiedSavedJson = JSON.stringify(this.json, null, 2);
    this._contents = contents;
    this.path = filePath;
    this.directory = nodePath.dirname(filePath);
    this._config = this.json[PKG_JSON_CONFIG_FIELD] || {};
    if (itemsByPath[this.path] === undefined) {
      itemsByPath[this.path] = new Set();
    }
    itemsByPath[this.path].add(this);
  }

  updater(json: Object) {
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
    if (Object.keys(this._config).length) {
      this.json[PKG_JSON_CONFIG_FIELD] = this._config;
    } else {
      delete this.json[PKG_JSON_CONFIG_FIELD];
    }
    let stringified = JSON.stringify(this.json, null, 2);
    if (stringified !== this._stringifiedSavedJson) {
      await fs.writeFile(
        this.path,
        JSON.stringify(
          this.json,
          null,
          detectIndent(this._contents).indent || "  "
        ) + "\n"
      );

      this._config = this.json[PKG_JSON_CONFIG_FIELD] || {};
      for (let item of itemsByPath[this.path]) {
        item.updater(this.json);
      }
      this._stringifiedSavedJson = stringified;
      return true;
    }
    return false;
  }
}
