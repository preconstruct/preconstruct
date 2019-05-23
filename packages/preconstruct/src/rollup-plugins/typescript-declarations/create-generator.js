// @flow
import * as fs from "fs-extra";
import path from "path";
import { createLanguageServiceHostClass } from "./some-thing";

export async function createDeclarationCreator(
  typescript: any,
  configFileName: string,
  dirname: string
): Promise<(filename: string) => { name: string, content: string }> {
  let configFileContents = await fs.readFile(configFileName, "utf8");

  const result = typescript.parseConfigFileTextToJson(
    configFileName,
    configFileContents
  );

  let thing = typescript.parseJsonConfigFileContent(
    result,
    typescript.sys,
    process.cwd(),
    undefined,
    configFileName
  );

  let LanguageServiceHostClass = createLanguageServiceHostClass(typescript);

  let servicesHost = new LanguageServiceHostClass(thing, []);

  let service = typescript.createLanguageService(
    servicesHost,
    typescript.createDocumentRegistry()
  );
  servicesHost.setLanguageService(service);

  return (filename: string) => {
    let output = service.getEmitOutput(filename, true);
    return {
      name: output.outputFiles[0].name.replace(
        dirname,
        path.join(dirname, "dist", "declarations")
      ),
      content: output.outputFiles[0].text
    };
  };
}
