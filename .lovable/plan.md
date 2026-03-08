

## Redesign Auth.tsx: 5-Step Signup + Fix Build Errors

### Build Error Fix (prerequisite)
Two edge functions have `err` typed as `unknown`:
- `supabase/functions/delete-account/index.ts` line 177: `err.message` → `(err as Error).message`
- `supabase/functions/export-user-data/index.ts` line 124: `err.message` → `(err as Error).message`

### Auth.tsx Complete Rewrite

**File:** `src/pages/Auth.tsx` — full rewrite, ~450 lines

**Layout:** Split-screen. Left column = existing static hero (hidden on mobile). Right column = dynamic content.

**State machine:**
- `mode`: `"login" | "signup" | "reset" | "pending"`
- `step`: `1 | 2 | 3 | 4 | 5` (only used when `mode === "signup"`)

**Right column structure:**
1. **Top bar**: Logo (mobile only) + "Log in instead" / "Sign up instead" button + 5-step progress bar (only visible during signup)
2. **Step content** with `animate-in fade-in slide-in-from-bottom-4` transition on each step change (keyed by step number)
3. **Back button** on steps 2-5

**Progress bar:** 5 small segments using the existing `Progress` component or simple div bars, filled up to the current step.

**Styling changes:**
- Labels: `text-xs font-bold uppercase tracking-wider text-muted-foreground`
- Inputs: `h-14 text-lg bg-muted/50 border-0 rounded-xl focus-visible:ring-2` (borderless, soft background)
- Buttons: `h-14 text-lg rounded-xl`
- Generous spacing: `space-y-6` between fields

**Step breakdown:**

| Step | Fields | Next condition |
|------|--------|---------------|
| 1 (Methods) | Welcome text + disclaimer + "Continue with Email" button + "Continue with Google" button | Click either button |
| 2 (Account) | Username (with existing uniqueness check) + Email | Both filled, username available |
| 3 (Security) | Password (with PasswordStrengthBar) + Confirm Password | All rules pass + passwords match |
| 4 (Demographics) | DOB (3 selects) + Gender select | All filled |
| 5 (Profile) | Display Name (optional) + "Sign Up" button | Submit triggers existing `signUp()` |

**Google OAuth (Step 1):** Call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` — Lovable Cloud manages Google OAuth automatically.

**Login flow:** Same as current — identifier + password, single screen, no progress bar.

**Reset flow:** Same as current — email input, single screen.

**Pending flow:** Same as current — email verification screen.

**All existing auth logic preserved:** `signIn`, `signUp`, `resetPassword` from `useAuth()`, username uniqueness via `check_username_available` RPC, pending invite redirect.

