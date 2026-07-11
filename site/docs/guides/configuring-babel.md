# Configuring Babel

Preconstruct uses Oxc by default. To use Babel, install `@babel/core` in your project and select it explicitly:

```json
{
  "preconstruct": {
    "transform": "babel"
  }
}
```

Preconstruct then uses Babel's normal configuration resolution. Preconstruct does not include Babel presets or plugins, so install and configure any transforms you need, such as `@babel/preset-env` for ES5 output or `@babel/preset-react` for JSX. You can [learn more about configuring Babel on the Babel site](https://babeljs.io/docs/en/configuration) and specifically about [configuring monorepos on the config files page](https://babeljs.io/docs/en/config-files#monorepos).
