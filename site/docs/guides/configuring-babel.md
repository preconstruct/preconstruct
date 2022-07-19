# Configuring Babel

Preconstruct uses Babel's normal configuration resolving logic so there isn't any Preconstruct-specific way of configuring Babel but there are some things you'll want to keep in mind. Preconstruct doesn't include any Babel plugins that compile anything by default so you will generally want to add presets like `@babel/preset-env` for compiling newer syntax to ES5 or `@babel/preset-react` for compiling JSX. You can [learn more about configuring Babel on the Babel site](https://babeljs.io/docs/en/configuration) and specifically about [configuring monorepos on the config files page](https://babeljs.io/docs/en/config-files#monorepos)