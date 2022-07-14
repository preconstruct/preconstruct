# Adding a second entrypoint

When adding a second entrypoint, you are creating a second place where a package can be accessed from. Note that much of the time you do not need a second entrypoint. We have a guide on [when to use multiple entrypoints](/guides/when-should-i-use-multiple-entrypoints).

So, let's assume we have a package called `emoji-uid` that gets us three random emojis, but we want to make a second function that only uses the best emojis. What we want to be able to do is write is:

```js
import getEmojiId from "emoji-uid";
import getAwesomeId from "emoji-uid/awesome";
```

With `preconstruct`'s base setup, this isn't possible, so we will need to add a new `awesome` entrypoint.

First, our project structure looks like:

```
- src
    /index.js
- package.json
```

and our package.json looks like:

```json
{
  "name": "emoji-uid",
  "version": "1.0.2",
  "description": "Get 🔥 UIDs to help make things 💯",
  "main": "dist/emoji-uid.cjs.js"
}
```

Let's assume we've written our new function in `src/awesome.js`

The first bit of config we need to do is to add an `entrypoints` field to our preconstruct config. We should add this in our package.json:

```json
  "preconstruct": {
    "entrypoints": ["index.js", "awesome.js"]
  },
```

This tells preconstruct to look for these two entrypoints. We have written out two, as the first is preconstruct's default entrypoint which we still want to include.

Finally, run

```bash
yarn preconstruct dev
```

to get set up for development. Preconstruct's CLI will alert you to any problems you are still encountering and provide guides on how to resolve them.

## Got stuck?

For further documentation, we recommend reading:

- [the package configuration options](/configuration#packages)
- [the entrypoint package.json configuration options](/configuration#entrypoints)

### I don't have a `preconstruct` field in my package.json

That's fine! If you haven't needed to add this field yet, you can add it with just add the precontsruct field so your `package.json` looks like:

```json
{
  "name": "emoji-uid",
  "version": "1.0.2",
  "description": "Get 🔥 UIDs to help make things 💯",
  "main": "dist/emoji-uid.cjs.js",
  "preconstruct": {
    "entrypoints": ["index.js", "awesome.js"]
  }
}
```
