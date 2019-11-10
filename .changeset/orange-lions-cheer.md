---
"@preconstruct/cli": patch
---

Fixed global prompt never showing up and get each global lazily so that peerDependencies which are never imported are not required to have a global
