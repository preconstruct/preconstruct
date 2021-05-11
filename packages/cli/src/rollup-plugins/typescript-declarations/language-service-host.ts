import * as fs from "fs";

export function normalize(fileName: string) {
  return fileName.split("\\").join("/");
}

export let createLanguageServiceHostClass = (
  typescript: typeof import("typescript"),
  replacePath: (path: string) => string
) =>
  class LanguageServiceHost {
    parsedConfig: any;
    transformers: any;
    cwd: string;
    snapshots: any;
    versions: any;
    fileNames: any;
    service: any;
    constructor(parsedConfig: any, transformers: any) {
      this.parsedConfig = parsedConfig;
      this.transformers = transformers;
      this.cwd = process.cwd();
      this.snapshots = {};
      this.versions = {};
      this.fileNames = new Set(parsedConfig.fileNames);
    }
    reset() {
      this.snapshots = {};
      this.versions = {};
    }
    setLanguageService(service: any) {
      this.service = service;
    }
    getProjectVersion() {
      return "1";
    }
    setSnapshot(fileName: string, data: any) {
      fileName = normalize(fileName);
      const snapshot = typescript.ScriptSnapshot.fromString(data);
      this.snapshots[fileName] = snapshot;
      this.versions[fileName] = (this.versions[fileName] || 0) + 1;
      this.fileNames.add(fileName);
      return snapshot;
    }
    getScriptSnapshot(fileName: string) {
      fileName = normalize(fileName);
      if (this.snapshots[fileName]) return this.snapshots[fileName];
      if (this.fileExists(fileName)) {
        this.snapshots[fileName] = typescript.ScriptSnapshot.fromString(
          this.readFile(fileName, "utf8")!
        );
        this.versions[fileName] = (this.versions[fileName] || 0) + 1;
        return this.snapshots[fileName];
      }
      return undefined;
    }
    getCurrentDirectory() {
      return this.cwd;
    }
    getScriptVersion(fileName: string) {
      fileName = normalize(fileName);
      return (this.versions[fileName] || 0).toString();
    }
    getScriptFileNames(): string[] {
      return Array.from(this.fileNames.values());
    }
    getCompilationSettings() {
      return this.parsedConfig.options;
    }
    getDefaultLibFileName(opts: any) {
      return typescript.getDefaultLibFilePath(opts);
    }
    useCaseSensitiveFileNames() {
      return typescript.sys.useCaseSensitiveFileNames;
    }
    readDirectory(path: string, extensions: any, exclude: any, include: any) {
      let read = typescript.sys.readDirectory(
        replacePath(path),
        extensions,
        exclude,
        include
      );
      console.log(read);
      return read;
    }
    readFile(path: string, encoding: string) {
      return typescript.sys.readFile(replacePath(path), encoding);
    }
    fileExists(path: string) {
      return typescript.sys.fileExists(replacePath(path));
    }
    getTypeRootsVersion() {
      return 0;
    }
    directoryExists(directoryName: string) {
      return typescript.sys.directoryExists(replacePath(directoryName));
    }
    getDirectories(directoryName: string) {
      let dirs = typescript.sys.getDirectories(replacePath(directoryName));
      console.log(dirs);
      return dirs;
    }
    getCustomTransformers() {
      return undefined;
    }
  };
