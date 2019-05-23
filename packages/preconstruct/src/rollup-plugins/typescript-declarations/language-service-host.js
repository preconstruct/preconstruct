import * as fs from "fs";

export function normalize(fileName) {
  return fileName.split("\\").join("/");
}

export let createLanguageServiceHostClass = typescript =>
  class LanguageServiceHost {
    constructor(parsedConfig, transformers) {
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
    setLanguageService(service) {
      this.service = service;
    }
    setSnapshot(fileName, data) {
      fileName = normalize(fileName);
      const snapshot = typescript.ScriptSnapshot.fromString(data);
      this.snapshots[fileName] = snapshot;
      this.versions[fileName] = (this.versions[fileName] || 0) + 1;
      this.fileNames.add(fileName);
      return snapshot;
    }
    getScriptSnapshot(fileName) {
      fileName = normalize(fileName);
      if (this.snapshots[fileName]) return this.snapshots[fileName];
      if (fs.existsSync(fileName)) {
        this.snapshots[fileName] = typescript.ScriptSnapshot.fromString(
          typescript.sys.readFile(fileName)
        );
        this.versions[fileName] = (this.versions[fileName] || 0) + 1;
        return this.snapshots[fileName];
      }
      return undefined;
    }
    getCurrentDirectory() {
      return this.cwd;
    }
    getScriptVersion(fileName) {
      fileName = normalize(fileName);
      return (this.versions[fileName] || 0).toString();
    }
    getScriptFileNames() {
      return Array.from(this.fileNames.values());
    }
    getCompilationSettings() {
      return this.parsedConfig.options;
    }
    getDefaultLibFileName(opts) {
      return typescript.getDefaultLibFilePath(opts);
    }
    useCaseSensitiveFileNames() {
      return typescript.sys.useCaseSensitiveFileNames;
    }
    readDirectory(path, extensions, exclude, include) {
      return typescript.sys.readDirectory(path, extensions, exclude, include);
    }
    readFile(path, encoding) {
      return typescript.sys.readFile(path, encoding);
    }
    fileExists(path) {
      return typescript.sys.fileExists(path);
    }
    getTypeRootsVersion() {
      return 0;
    }
    directoryExists(directoryName) {
      return typescript.sys.directoryExists(directoryName);
    }
    getDirectories(directoryName) {
      return typescript.sys.getDirectories(directoryName);
    }
    getCustomTransformers() {
      return undefined;
    }
  };
