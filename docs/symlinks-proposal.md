# Symlink aliases proposal

## What problem is this proposal addressing?

There are some problems with the current aliasing solution which this would address.

- Each specific tool needs their own aliases and some tools don't provide ways to add aliases.
- There are sublte problems with the way aliases work since it adds aliases for `package-name/path-to-entrypoint` -> `/absolute/path/to/source`

## What is it?

This would involve adding a new command called `dev` (not sure about the name). When running the command, preconstruct would create symlinks where dist files go when `preconstruct build` is run to their appropriate source files.

This would solve the problem since tools can just resolve the module like they would normally.

## Drawbacks

- You have to run the command before you can work on a project and after you change what packages and entrypoints preconstruct should build
  - This could be mostly alleviated by putting it in a postinstall script though that wouldn't solve the case when you change what packages and entrypoints preconstruct should build
- This makes aliases all or nothing because you couldn't import a dist file in one tool(e.g. Node) and use the aliases to import a source file in another tool(e.g. webpack)
  - This could arguably be a good thing though since it would force us to come up with an solution to this that works everywhere
  - This means we'd have to be 100% confident in require hooks and I'm not sure if that's a good trade off to make

## Alternatives

Something like this proposal except for the CJS build, instead of writing a symlink, write a file something like this.

```jsx
let unregister = require("preconstruct").___babelRequireHook(__dirname);

module.exports = require("../path/to/source");

// we don't want to modify anything that isn't from preconstruct
unregister();
```

This would solve the problem of people having to handle Babel compilation themselves/having to add a require hook themselves. That could be worse for using preconstruct with jest since jest would compile stuff along with preconstruct compiling things.

## Unresolved questions

- Is this overcomplicating things when it mostly works right now?
- Is having to have something that has to be run on postinstall and whenever changes are made to preconstruct config worth it?
