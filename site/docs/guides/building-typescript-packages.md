# Building TypeScript packages

Preconstruct uses Babel to compile code so you have to [configure Babel](/guides/configuring-babel) to use [`@babel/preset-typescript`](https://babeljs.io/docs/en/babel-preset-typescript).

```json
{
  "presets": ["@babel/preset-typescript"]
}
```

## Generating TypeScript declarations {#generating-typescript-declarations}

Preconstruct automatically generates TypeScript declarations for all entrypoints in a package. There's no work required to configure this other than having your entrypoint source file be a `.ts` or `.tsx` file and having a `tsconfig.json`.

## Configuring TypeScript {#configuring-typescript}

Because Preconstruct uses Babel to compile TypeScript packages, it is recommended to set the `isolatedModules` compiler option to ensure your TypeScript source can be built with Babel.

In your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "isolatedModules": true
  }
}
```

See the [TypeScript documentation on the `isolatedModules` option](https://www.typescriptlang.org/tsconfig#isolatedModules) and the [Babel documentation on TypeScript compiler options](https://babeljs.io/docs/en/babel-plugin-transform-typescript#typescript-compiler-options) for more information.

