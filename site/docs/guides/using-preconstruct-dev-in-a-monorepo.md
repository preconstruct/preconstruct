# Using preconstruct dev in a Monorepo

A common use case in monorepos is that there are some packages which depend on each other and you want to test them. This creates a problem if you're building them with a tool like Preconstruct though. When you import packages, you'll be importing the dist files, so you have to run `preconstruct watch` or `preconstruct build` which is slow and requires running another process.

`preconstruct dev` aims to solve this. The recommended way to use it is to add it to a postinstall script in your package.json.

```json
{
  "scripts": {
    "postinstall": "preconstruct dev"
  }
}
```

Once you add it to your package.json and run `yarn`, Preconstruct creates links from your source files to the appropriate source file. For the CommonJS dist file, Preconstruct creates a file which installs a require hook which compiles the package with Babel so that you can directly require the code in any Node code without having to do anything special to compile the package. For module builds, Preconstruct creates files that re-export the source files, so you have to compile the packages in your bundler. For example, if you're using webpack, you should use babel-loader. Preconstruct also creates files for Flow and TypeScript to resolve to the source files.

> Note: The re-exports for module builds use CommonJS, this is done because ESM cannot re-export an entire module including default exports unless you know what the exports of the module are.
