# Preconstruct

> Dev and build your code painlessly in monorepos

## Key Features

- In dev mode, your code behaves the same as it will in production, including locally linked in monorepos
- Add multiple entrypoints to your packages for publishing
- CLI helps walk you through set-up and making changes to your configs
- Works with different kinds of JS monorepos
- Also works for single package repos!
- Builds your code with rollup

## Getting Started

To install Preconstruct run

```
yarn add @preconstruct/cli
```

Next, set up preconstruct.

```
yarn preconstruct init
```

Next, run `yarn preconstruct dev` and you can get started.

> We strongly recommend making a postinstall script in your `package.json` that runs `preconstruct dev` such as `"postinstall": "preconstruct dev"`

## Publishing packages

Before you publish packages to npm, run `preconstruct build`.

> We strongly recomment making a single script in your package.json that runs both build and publish, to stop broken publishes, such as `"release": "preconstruct build && yarn publish:packages`

## Further Guides

There are a number of tasks that become easier with preconstruct that lie slightly outside the main workflow. Check out the following guides for setting these up.

- [A more detailed account of getting set up](./detailed-usage)
- [Setting up a second entrypoint](./multiple-entrypoitns)
- [CLI command documentation](./api)
- [Other configuration](./configuration)
