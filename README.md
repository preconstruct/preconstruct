# Preconstruct 🎁

> Dev and build your code painlessly in monorepos

<p>
  <a aria-label="NPM version" href="https://www.npmjs.com/package/@preconstruct/cli">
    <img alt="" src="https://img.shields.io/npm/v/@preconstruct/cli.svg?style=for-the-badge&labelColor=0869B8">
  </a>
  <a aria-label="License" href="#">
    <img alt="" src="https://img.shields.io/npm/l/@preconstruct/cli.svg?style=for-the-badge&labelColor=579805">
  </a>
  <a aria-label="Thinkmill Logo" href="https://www.thinkmill.com.au/open-source?utm_campaign=github-preconstruct">
    <img src="https://img.shields.io/badge/Sponsored%20BY%20Thinkmill-ed0000.svg?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTg2IiBoZWlnaHQ9IjU4NiIgdmlld0JveD0iMCAwIDU4NiA1ODYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8xOTk2XzQwNikiPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTU4NiAyOTNDNTg2IDQ1NC44MTkgNDU0LjgxOSA1ODYgMjkzIDU4NkMxMzEuMTgxIDU4NiAwIDQ1NC44MTkgMCAyOTNDMCAxMzEuMTgxIDEzMS4xODEgMCAyOTMgMEM0NTQuODE5IDAgNTg2IDEzMS4xODEgNTg2IDI5M1pNMjA1Ljc3NiAzNTguOTQ0QzE5MS4zNzYgMzU4Ljk0NCAxODUuOTA0IDM1Mi4zMiAxODUuOTA0IDMzNS45MDRWMjYyLjc1MkgyMTQuNDE2VjIzNy42OTZIMTg1LjkwNFYyMDEuMTJIMTUzLjA3MlYyMzcuNjk2SDEyOC41OTJWMjYyLjc1MkgxNTMuMDcyVjM0MC44QzE1My4wNzIgMzcyLjc2OCAxNjYuNjA4IDM4NS43MjggMTk3LjQyNCAzODUuNzI4QzIwMy40NzIgMzg1LjcyOCAyMTAuOTYgMzg0LjU3NiAyMTUuODU2IDM4My4xMzZWMzU3LjUwNEMyMTMuNTUyIDM1OC4zNjggMjA5LjUyIDM1OC45NDQgMjA1Ljc3NiAzNTguOTQ0Wk00MDcuMzc2IDIzNC4yNEMzODUuMiAyMzQuMjQgMzcxLjA4OCAyNDQuMDMyIDM2MC40MzIgMjYwLjczNkMzNTIuOTQ0IDI0My40NTYgMzM3LjM5MiAyMzQuMjQgMzE3LjIzMiAyMzQuMjRDMjk5Ljk1MiAyMzQuMjQgMjg2Ljk5MiAyNDEuMTUyIDI3Ni42MjQgMjU1LjI2NEgyNzYuMDQ4VjIzNy42OTZIMjQ0LjY1NlYzODRIMjc3LjQ4OFYzMDUuNjY0QzI3Ny40ODggMjc3LjQ0IDI4OC43MiAyNjAuNzM2IDMwOC4zMDQgMjYwLjczNkMzMjUuMjk2IDI2MC43MzYgMzM0LjUxMiAyNzIuODMyIDMzNC41MTIgMjkzLjU2OFYzODRIMzY3LjM0NFYzMDUuMDg4QzM2Ny4zNDQgMjc3LjE1MiAzNzguODY0IDI2MC43MzYgMzk4LjE2IDI2MC43MzZDNDE0LjU3NiAyNjAuNzM2IDQyNC42NTYgMjcxLjEwNCA0MjQuNjU2IDI5Ny4wMjRWMzg0SDQ1Ny40ODhWMjkzLjg1NkM0NTcuNDg4IDI1NC40IDQzOC40OCAyMzQuMjQgNDA3LjM3NiAyMzQuMjRaIiBmaWxsPSJ3aGl0ZSIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzE5OTZfNDA2Ij4KPHJlY3Qgd2lkdGg9IjU4NiIgaGVpZ2h0PSI1ODYiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg==&labelColor=C60200&locoColor=white&logoWidth=0">
  </a>

  </p>

---

## Key Features

- In dev mode, your code behaves the same as it will in production, including locally linked in monorepos
- Add multiple entrypoints to your packages for publishing
- CLI helps walk you through set-up and making changes to your configs
- Works with different kinds of JS monorepos
- Also works for single package repos!
- Builds your code with rollup

## Getting Started

Assuming you already have a source file at src/index.js (or src/index.ts) or you're using Yarn Workspaces and have packages with src/index.js (or src/index.ts), you can setup Preconstruct like this.

```bash
yarn add --dev @preconstruct/cli
yarn preconstruct init
```

If you're in a monorepo, you should also run `yarn preconstruct dev` and add it to a postinstall script(`"postinstall": "preconstruct dev"`) that runs preconstruct dev so that you can import your code without having to rebuild your project every time in changes.

## Publishing packages

Before you publish packages to npm, run `preconstruct build`. Preconstruct will use your Babel config and build flat bundles so make sure to [configure Babel](https://preconstruct.tools/guides/configuring-babel) with the transforms you want.

> We strongly recomment making a single script in your package.json that runs both build and publish, to stop broken publishes, such as `"release": "preconstruct build && yarn publish:packages`. If you're in a single-package repo, you could also run `preconstruct build` in a `prepare` or `prepublishOnly` script.

## Further Guides

There are a number of tasks that become easier with preconstruct that lie slightly outside the main workflow. Check out the following guides for setting these up.

- [A more detailed account of getting set up](https://preconstruct.tools/tutorials)
- [Setting up a second entrypoint](https://preconstruct.tools/guides/adding-a-second-entrypoint)
- [CLI command documentation](https://preconstruct.tools/commands)
- [Other configuration](https://preconstruct.tools/configuration)

# See the docs at [preconstruct.tools](https://preconstruct.tools)

# Thanks/Inspiration

- [microbundle](https://github.com/developit/microbundle) was a huge inspiration for this! ❤️
- [rollup](https://rollupjs.org) - rollup has done the really hard stuff that makes preconstruct possible!
- [bolt](https://github.com/boltpkg/bolt) - lots of utils and things in this project were inspired by things in bolt
- [Kye Hohenberger](https://github.com/tkh44) for thinking of the name preconstruct
- Too many awesome people to name at [Thinkmill](https://thinkmill.com.au) who have given so much great feedback to make Preconstruct better and Thinkmill for sponsoring the development of Preconstruct 💝
- all the people who wrote all the dependencies for this project!
