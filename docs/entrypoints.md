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

- globs?
