# Entrypoints

The entrypoints config would essentially default to

```json
{
  "preconstruct": {
    "entrypoints": {
      ".": "src"
    }
  }
}
```

```json
{
  "preconstruct": {
    "entrypoints": {
      "something": "src/something"
    }
  }
}
```

This would create an entrypoint that would be imported as `package-name/something` which would map to `src/something`.

## Problems

### Common dependencies between bundles

Let's say we have module a, b and c. Module a and b are entry points and they both depend on c. What should happen?

A common bundle(s) should be generated which would contain the minimum shared modules.

Looks like this is already completely solved by rollup. https://rollupjs.org/guide/en#code-splitting

## Other Ideas

- globs?
