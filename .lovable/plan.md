

## Fix Missing Auth Translations + Restore Input Borders

### Problem
The Auth.tsx rewrite introduced ~15 new translation keys that don't exist in `en.ts` or `ar.ts`, causing raw keys like `auth.continueWithEmail` to render as visible text. The fallback `|| "..."` pattern only works if `t()` returns empty string, but i18next returns the key itself when missing -- so the fallbacks never trigger.

Additionally, `inputClass` uses `border-0` which removes all input strokes/borders.

### Changes

**1. `src/i18n/en.ts`** — Add missing keys to `auth` and `common` sections:

| Key | Value |
|-----|-------|
| `auth.continueWithEmail` | Continue with Email |
| `auth.continueWithGoogle` | Continue with Google |
| `auth.privacyPolicy` | Privacy Policy |
| `auth.termsOfUse` | Terms of Use |
| `auth.disclaimer` | By signing up you agree to the |
| `auth.accountBasics` | Let's start with the basics |
| `auth.security` | Security |
| `auth.securitySubtext` | Choose a strong password |
| `auth.aboutYou` | About You |
| `auth.demographicsSubtext` | Tell us a bit about yourself |
| `auth.almostDone` | Almost Done |
| `auth.profileSubtext` | Pick a display name |
| `auth.welcomeBack` | Welcome back |
| `auth.resetSubtext` | Enter your email to reset |
| `common.continue` | Continue |
| `common.back` | Back |
| `common.or` | or |
| `common.and` | and |

**2. `src/i18n/ar.ts`** — Add the same keys with Arabic translations.

**3. `src/pages/Auth.tsx`** — Fix input styling:
- Change `inputClass` from `border-0` to `border border-border` to restore visible strokes on all fields
- Remove the `|| "fallback"` patterns from `t()` calls since the keys will now exist (cleanup)

