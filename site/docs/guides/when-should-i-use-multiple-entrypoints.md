# When should I use multiple entrypoints?

Having multiple entrypoints in a package means that someone can import from different paths in the same package, e.g. `react-dom` and `react-dom/server`.

There are a couple reasons you may want to have multiple entrypoints in a package.

The most common reason is if you have some client side code and some server side code and you don't want users to pay the cost of loading that server side code or the server side code depends on some modules which aren't available for the browser.

The other significant reason to use multiple entrypoints that's more applicable to client side code is if you a sizable amount of code that you want people to be able to use but most people won't need it. A way to answer the question of "Should something be in its own entrypoint?" for this case, you can ask yourself these questions.

- Is the thing rarely used in comparison to the primary part of your package?
- Is the amount of code large?
- If it's a dependency of something else exposed by the package (the dependent), will someone want to import it without also importing any dependents of this or is it likely that the dependent will be changed to so it doesn't depend on the thing in the future?

If your answer to these questions is mostly yes then having multiple entrypoints might make sense for your package.
