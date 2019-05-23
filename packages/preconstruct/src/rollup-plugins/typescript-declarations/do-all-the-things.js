function doStuff() {
  let tsConfigFile = ts.findConfigFile(__dirname, ts.sys.fileExists);

  let config = ExtractorConfig.prepare({
    configObjectFullPath: undefined,
    packageJson: { name: "thing", dependencies: {} },
    packageJsonFullPath: undefined,

    configObject: {
      mainEntryPointFilePath: path.join(process.cwd(), "index.d.ts"),
      projectFolder: process.cwd(),

      compiler: {
        tsconfigFilePath: tsConfigFile
      },
      dtsRollup: {
        enabled: true,
        untrimmedFilePath: path.join(process.cwd(), "rollup.d.ts")
      }
    }
  });

  let messages = [];

  let extractor = Extractor.invoke(config, {
    messageCallback: message => {
      messages.push(message);
    }
  });

  if (!extractor.succeeded) {
    throw new Error(
      `there was a problem with typescript declaration generation, please open an issue with the contents of the package that this error is from and the following text.\n${messages.join(
        "\n"
      )}`
    );
  }
}
