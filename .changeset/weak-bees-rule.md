---
"@preconstruct/cli": patch
---

Fixed generating declaration maps with versions of TypeScript 4.3 and above.

Errors are now also emitted when TypeScript fails to generate declarations because it needs to reference a type that isn't exported. Previously Preconstruct silently generated a broken declaration file when encountering inputs like the one shown below where TypeScript needs to be able to name the type `X` when generating the `d.ts` file for `index.ts` but it isn't exported, now it will emit an error instead. To fix the error, you need to export the type.

```ts
// @filename: index.ts
import { getX } from "./x";

export const x = getX();

// @filename: x.ts
type X = {
  x?: X;
};

export const getX = (): X => ({});
```

Note that Preconstruct still does not run TypeScript's type checking, you should still do that in addition to running Preconstruct, Preconstruct will only emit these specific errors.
