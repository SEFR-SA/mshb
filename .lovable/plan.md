

## Problem

The `@lovable.dev/cloud-auth-js` package is a Lovable-specific package that gets automatically installed in the Lovable cloud build environment but is **not available on npm** for local installs. Your local `npm install` skips it, so Vite/Rollup can't resolve it during `npm run build`.

## Fix

Externalize this module in `vite.config.ts` so Rollup doesn't fail when it can't find it locally. The module is only used for Lovable's OAuth flow (Google/Apple sign-in via Lovable Cloud), which won't work in a local/Electron build anyway.

### Changes

| File | What |
|------|------|
| `vite.config.ts` | Add `build.rollupOptions.external` for `@lovable.dev/cloud-auth-js` |

### Detail

In `vite.config.ts`, add inside the returned config object:

```ts
build: {
  rollupOptions: {
    external: ['@lovable.dev/cloud-auth-js'],
  },
},
```

This lets the Lovable cloud build (which has the package) work normally, while your local VS Code build skips the unresolvable import without crashing.

