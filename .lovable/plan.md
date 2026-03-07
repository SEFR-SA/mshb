

## Root Cause: `--base=./` in build script

The published site serves completely empty HTML — no `<script>` tags, no CSS, no `<head>` content. The app can't load at all.

**The problem is on line 12 of `package.json`:**

```json
"build": "vite build --base=./"
```

When Lovable publishes your project, it runs `npm run build`. The `--base=./` CLI flag **overrides** your `vite.config.ts` base path logic and forces all asset references to use relative paths (`./assets/index-abc123.js` instead of `/assets/index-abc123.js`).

Your `vite.config.ts` already handles this correctly:
```ts
base: process.env.ELECTRON === 'true' ? './' : '/'
```

But the `--base=./` in the build script takes precedence, making the config's conditional logic pointless. On Lovable's hosting, relative asset paths don't resolve correctly — resulting in the white screen.

### Fix (1 file, 1 line)

**`package.json` line 12** — Remove `--base=./` from the build script:

```json
"build": "vite build",
```

This lets `vite.config.ts` control the base path: `/` for web builds, `./` only when `ELECTRON=true`. For your Electron builds, create a dedicated script:

```json
"build:electron": "cross-env ELECTRON=true vite build",
```

| File | Change |
|------|--------|
| `package.json` | Remove `--base=./` from `build` script, add `build:electron` script |

