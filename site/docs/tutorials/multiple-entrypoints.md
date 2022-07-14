---
sidebar_position: 4
---

# Exporting Multiple Entrypoints

> **Note:** this tutorial builds upon [the Getting Started tutorial](/tutorials) so if you haven't gone through it, you should do that first.

> A repository with the end result of this tutorial is available at https://github.com/preconstruct/a-random-number-with-create

> Curious why you would want multiple entrypoints in a package? Read the [When should I use multiple entrypoints?](/guides/when-should-i-use-multiple-entrypoints) guide.

We're going to create another package from `a-random-number` called `a-random-number-with-create` and add another entrypoint called `create` so that people can import `a-random-number-with-create/create` to create their own random numbers and still import `a-random-number-with-create` to get a random number.

First, we'll create `src/create.js`.

```jsx
export let createRandom = () => Math.random();
```

We'll also make `src/index.js` use it.

```jsx
import { createRandom } from "./create";

export let random = createRandom();
```

Then we can set what the entrypoints for our package should be in our `package.json`

```json
"preconstruct": {
  "entrypoints": [
    "index.js",
    "create.js"
  ]
}
```

If we run `yarn preconstruct fix` now, Preconstruct will create a package.json at `create/package.json` that will allow people to import `a-random-number-with-create/create` and have the CommonJS bundle loaded when required in Node and the ESM file loaded in bundlers.

Now if we run `yarn preconstruct build` and publish the package, users can import `a-random-number-with-create/create`.
