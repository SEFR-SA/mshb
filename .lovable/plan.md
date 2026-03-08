

## Plan: Remove Google OAuth / @lovable.dev/cloud-auth-js Entirely

### Changes

| File | What |
|------|------|
| `src/pages/Auth.tsx` | Remove `import { lovable }` line, delete `handleGoogleSignIn` function, remove all Google sign-in buttons (the `onClick={handleGoogleSignIn}` buttons with the Google SVG icon) |
| `src/integrations/lovable/index.ts` | Delete the entire file |
| `package.json` | Remove `@lovable.dev/cloud-auth-js` from dependencies |
| `vite.config.ts` | Remove the `build.rollupOptions.external` array (no longer needed) |
| `forge.config.cjs` | Remove the `ignore` regex for `@lovable\.dev` (no longer needed) |

### Notes
- The Google sign-in buttons appear in at least two places in Auth.tsx (step 1 and another step). All will be removed.
- Email/password and username sign-in remain unchanged.
- The `src/integrations/lovable/` folder can be fully removed since `index.ts` is its only file.

