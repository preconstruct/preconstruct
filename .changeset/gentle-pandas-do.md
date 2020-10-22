---
"@preconstruct/next": major
---

Make modules that aren't in node modules be bundled by Next even in SSR, this resolves an issue where you make a change to a package outside of your Next app and see the change via a hot reload or client-side navigation but when doing a server render of the page, it doesn't have the changes. This being released as a major version because it's making changes to Next's externals function and there's a chance it could cause issues.
