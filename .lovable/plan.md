

## Plan: Add Toast on Remote Sign-Out

### Changes

| File | What |
|------|------|
| `src/hooks/useDeviceTracker.ts` | Before calling `supabase.auth.signOut()`, store a flag in `localStorage` (e.g. `mshb_kicked`) so the Auth page can show a toast after redirect |
| `src/pages/Auth.tsx` | On mount, check for the `mshb_kicked` flag in localStorage; if present, show a sonner toast "You were logged out from another device" and clear the flag |
| `src/i18n/en.ts` | Add `auth.kickedOut` key |
| `src/i18n/ar.ts` | Add `auth.kickedOut` key |

### Why localStorage instead of in-memory toast?

`signOut()` clears the session and triggers a redirect to `/auth`. Any in-memory toast would be lost during the navigation. Writing a flag to localStorage before sign-out lets the Auth page pick it up after the redirect.

