# Node Require Hook Proposal

## What problem is this proposal addressing?

## What's the API and what does it do?

```jsx
require("preconstruct").hook(projectPath);
```

- Add aliases from entrypoint -> source with node module resolve hook things
- When an entrypoint is required, the code will be transformed with babel according to the babel config that would be used in `preconstruct build` but with an esm -> commonjs transform, a babel register hook with the same babel config will also be added to the top of the file and removed at the end of the file
