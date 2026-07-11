# Building TypeScript packages

Preconstruct uses Oxc to strip TypeScript syntax by default and reads supported compiler settings from the nearest applicable `tsconfig.json`.

If you select the [Babel transform](/guides/configuring-babel), configure [`@babel/preset-typescript`](https://babeljs.io/docs/en/babel-preset-typescript):

```json
{
  "presets": ["@babel/preset-typescript"]
}
```

## Generating TypeScript declarations {#generating-typescript-declarations}

Preconstruct automatically generates TypeScript declarations for all entrypoints in a package. There's no work required to configure this other than having your entrypoint source file be a `.ts` or `.tsx` file and having a `tsconfig.json`.

## Configuring TypeScript {#configuring-typescript}

Preconstruct compiles TypeScript one file at a time in both Oxc and Babel modes, so it is recommended to set the `isolatedModules` compiler option.

In your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "isolatedModules": true
  }
}
```

See the [TypeScript documentation on the `isolatedModules` option](https://www.typescriptlang.org/tsconfig#isolatedModules) for more information.
