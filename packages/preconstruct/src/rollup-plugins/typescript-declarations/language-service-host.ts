import * as fs from "fs";

export function normalize(fileName: string) {
  return fileName.split("\\").join("/");
}

export let createLanguageServiceHostClass = (typescript: any) =>
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
    getScriptVersion(fileName: string) {
      fileName = normalize(fileName);
      return (this.versions[fileName] || 0).toString();
    }
    getScriptFileNames() {
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
      return typescript.sys.readDirectory(path, extensions, exclude, include);
    }
    readFile(path: string, encoding: string) {
      return typescript.sys.readFile(path, encoding);
    }
    fileExists(path: string) {
      return typescript.sys.fileExists(path);
    }
    getTypeRootsVersion() {
      return 0;
    }
    directoryExists(directoryName: string) {
      return typescript.sys.directoryExists(directoryName);
    }
    getDirectories(directoryName: string) {
      return typescript.sys.getDirectories(directoryName);
    }
    getCustomTransformers() {
      return undefined;
    }
  };
