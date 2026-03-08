

## Problem

Electron Forge uses `flora-colossus` to walk all dependencies listed in `package.json`. Since `@lovable.dev/cloud-auth-js` is listed as a dependency but doesn't exist locally (it's only available in the Lovable cloud), the packager crashes.

## Fix

Add an `ignore` pattern to `packagerConfig` in `forge.config.cjs` to tell Electron Packager to skip this module during dependency walking.

### Changes

| File | What |
|------|------|
| `forge.config.cjs` | Add `ignore` function to `packagerConfig` that excludes `@lovable.dev/cloud-auth-js` |

### Detail

In `forge.config.cjs`, update `packagerConfig`:

```js
packagerConfig: {
  asar: true,
  name: 'mshb',
  icon: path.join(__dirname, 'assets/icon'),
  ignore: [
    /node_modules\/@lovable\.dev/,
  ],
},
```

This tells Electron Packager to skip the `@lovable.dev` module directory entirely, preventing `flora-colossus` from trying to resolve it. The module is only used for Lovable Cloud OAuth and has no function in the Electron build.

