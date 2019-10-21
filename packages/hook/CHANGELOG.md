# @preconstruct/hook

## 0.1.0

### Minor Changes

- [`f02cce5`](https://github.com/preconstruct/preconstruct/commit/f02cce5b05650485da522f29dd7758b290505986) [#163](https://github.com/preconstruct/preconstruct/pull/163) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Remove automatic inclusion of `@babel/plugin-transform-runtime`.

  Preconstruct no longer automatically includes `@babel/plugin-transform-runtime` to reduce confusion where code works when built with Preconstruct but fails if built using another tool which directly uses a project's Babel config. You should **include `@babel/plugin-transform-runtime`** in your Babel config unless it is already included.

  ```js
  {
    "plugins": ["@babel/plugin-transform-runtime"]
  }
  ```

## 0.0.5

### Patch Changes

- [aefeb4f](https://github.com/preconstruct/preconstruct/commit/aefeb4f55c11a847217a5f868e132bd20a373711) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Use TypeScript internally

## 0.0.4

### Patch Changes

- [19d36a4](https://github.com/preconstruct/preconstruct/commit/19d36a4) - Build preconstruct with preconstruct

## 0.0.3

### Patch Changes

- [9efd990](https://github.com/preconstruct/preconstruct/commit/9efd990) - Fix source map support

## 0.0.2

### Patch Changes

- [aea0c36](https://github.com/preconstruct/preconstruct/commit/aea0c36) - Only install source map support when the require hook is actually run

## 0.0.1

### Patch Changes

- [698fe38](https://github.com/preconstruct/preconstruct/commit/698fe38) [#53](https://github.com/preconstruct/preconstruct/pulls/53) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Move require hook into a package
