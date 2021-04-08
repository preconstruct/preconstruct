# @preconstruct/next

## 2.0.2

### Patch Changes

- [`559cb00`](https://github.com/preconstruct/preconstruct/commit/559cb00229d76387bc2fb7d6a9fdaf845d36e618) [#388](https://github.com/preconstruct/preconstruct/pull/388) Thanks [@VadimZhiltsov](https://github.com/VadimZhiltsov)! - Add "hook-loader.js" to package files list so it exists on npm

## 2.0.1

### Patch Changes

- [`71c6af6`](https://github.com/preconstruct/preconstruct/commit/71c6af6f583b502eb80f1b78ff04cc17bc613014) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Importing dependencies in server-side code will no longer bundle @preconstruct/hook(and therefore Babel) when using `preconstruct dev` and this package. Note this is specific to Next and is not generally needed because Next changes webpack's `mainFields` when bundling for Node to prefer the `main` field over webpack's default of prefering the `module` field.

## 2.0.0

### Major Changes

- [`15a5bd8`](https://github.com/preconstruct/preconstruct/commit/15a5bd806a6928542df6cf140bdc9be378b33ea2) [#335](https://github.com/preconstruct/preconstruct/pull/335) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Make modules that aren't in node modules be bundled by Next even in SSR, this resolves an issue where you make a change to a package outside of your Next app and see the change via a hot reload or client-side navigation but when doing a server render of the page, it doesn't have the changes. This being released as a major version because it's making changes to Next's externals function and there's a chance it could cause issues.

## 1.0.1

### Patch Changes

- [`0b7914f`](https://github.com/preconstruct/preconstruct/commit/0b7914f20c775b60c1fc68d34b8323ecb2edba52) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Remove debugger statements

## 1.0.0

### Major Changes

- [`4b4e558`](https://github.com/preconstruct/preconstruct/commit/4b4e55859f5dc474f26a44716f9e258fe374837d) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Make Next use a custom Babel config even if it's in different higher directory than the Next site with `rootMode: 'upward-optional'`

## 0.1.1

### Patch Changes

- [`8ff2569`](https://github.com/preconstruct/preconstruct/commit/8ff2569d9f6f82b432f7a1e20d4f545c238dfee4) Thanks [@mitchellhamilton](https://github.com/mitchellhamilton)! - Improve README

## 0.1.0

### Minor Changes

- [25be437](https://github.com/preconstruct/preconstruct/commit/25be437c7cadea9bcaeb9f601a5c7b1d2593df81) [#63](https://github.com/preconstruct/preconstruct/pull/63) Thanks [@JedWatson](https://github.com/JedWatson)! - Create package
