import * as fs from "fs-extra";
import * as realFs from "fs";
import nodePath from "path";
import detectIndent from "detect-indent";
import parseJson from "parse-json";
import { JSONValue } from "./utils";

type JSONDataByPath = Map<
  string,
  { value: JSONValue; stringifiedSaved: string }
>;

type BaseConfig = Record<string, JSONValue | undefined> & {
  preconstruct?: JSONValue;
};

export class Item<JSONData extends BaseConfig = BaseConfig> {
  path: string;
  indent: string;
  directory: string;
  _jsonDataByPath: JSONDataByPath;
  constructor(
    filePath: string,
    contents: string,
    jsonDataByPath: JSONDataByPath
  ) {
    this.indent = detectIndent(contents).indent || "  ";
    this.path = filePath;
    this.directory = realFs.realpathSync.native(nodePath.dirname(filePath));
    this._jsonDataByPath = jsonDataByPath;
    if (!jsonDataByPath.has(this.path)) {
      const json = parseJson(contents, filePath);
      jsonDataByPath.set(this.path, {
        value: json,
        stringifiedSaved: JSON.stringify(json),
      });
      if (!this.json.preconstruct) {
        this.json.preconstruct = {};
      }
    }
  }

  get json() {
    return this._jsonDataByPath.get(this.path)!.value as JSONData;
  }

  set json(value) {
    this._jsonDataByPath.set(this.path, {
      value,
      stringifiedSaved: this._jsonDataByPath.get(this.path)!.stringifiedSaved,
    });
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
    let stringified = JSON.stringify(json);
    if (stringified !== this._jsonDataByPath.get(this.path)!.stringifiedSaved) {
      await fs.writeFile(
        this.path,
        JSON.stringify(json, null, this.indent) + "\n"
      );
      return true;
    }
    return false;
  }
}
