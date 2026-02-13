

# Profile Banners, About Me, Username Signup & Password Strength

## Overview
Four changes: (1) banner image upload + display, (2) "About Me" field in Settings, (3) mandatory username on signup with password strength rules, (4) display everything in the right panel.

---

## 1. Database Migration

Add two new columns to `profiles`:
- `banner_url` (text, nullable) -- stores the uploaded banner image URL
- `about_me` (text, nullable, default '') -- a longer "About Me" bio field, separate from `status_text`

No new RLS needed -- existing policies cover profile updates.

---

## 2. Banner Upload + About Me in Settings Page

**`src/pages/Settings.tsx`**:
- Add a banner area at the top (full-width, ~150px tall) showing the current banner image or a gradient placeholder
- Add a camera/upload button overlay on the banner to upload a new image (same pattern as avatar upload, stored in `avatars` bucket under `{userId}/banner.{ext}`)
- Add an "About Me" textarea field in the profile card (multi-line, max 500 chars)
- Save `banner_url` and `about_me` in the `handleSave` function

---

## 3. Right Panel Updates

**`src/components/chat/UserProfilePanel.tsx`**:
- Replace the static `bg-primary/20` banner div with an `<img>` tag showing `profile.banner_url` (fallback to gradient if no banner)
- Add "About Me" section below status text (separate from status_text)
- Keep status_text displayed as "Custom Status" and about_me as "About Me"

---

## 4. Signup: Username Mandatory + Password Strength

**`src/pages/Auth.tsx`**:
- Rename the signup field from "Display Name" to "Username" (make it required)
- Pass the username to `signUp()` which stores it as `username` in the profile
- Add password validation rules:
  - Uppercase letter (A-Z)
  - Lowercase letter (a-z)
  - Number (0-9)
  - Special character (!@#$%^&*()-_+={}[]:;"'<>,.?/\\|)
  - Minimum 8 characters
  - Block common passwords (password, 123456, qwerty, etc.)
- Add a **4-level strength bar** below the password field:
  - **Weak** (red) -- meets 1 rule
  - **Good** (orange) -- meets 2-3 rules
  - **Strong** (yellow-green) -- meets 4 rules
  - **Very Strong** (green) -- meets all 5 rules
- Show individual rule checkmarks/crosses as the user types
- Block form submission unless all rules pass

**`src/contexts/AuthContext.tsx`**:
- Change `signUp` to accept `username` instead of `displayName`
- Update the metadata passed to `supabase.auth.signUp` and also set `username` in the profile trigger or update after signup

---

## 5. i18n Additions

**English (`en.ts`)**:
```
auth.username: "Username"
auth.usernameRequired: "Username is required"
auth.passwordRules: "Password must contain:"
auth.ruleUppercase: "One uppercase letter (A-Z)"
auth.ruleLowercase: "One lowercase letter (a-z)"
auth.ruleNumber: "One number (0-9)"
auth.ruleSpecial: "One special character (!@#$...)"
auth.ruleLength: "At least 8 characters"
auth.ruleCommon: "Must not be a common password"
auth.strengthWeak: "Weak"
auth.strengthGood: "Good"
auth.strengthStrong: "Strong"
auth.strengthVeryStrong: "Very Strong"
profile.aboutMeLabel: "About Me"
profile.aboutMePlaceholder: "Tell others about yourself..."
profile.banner: "Banner"
profile.uploadBanner: "Upload Banner"
```

**Arabic (`ar.ts`)**: Equivalent translations for all keys above.

---

## Technical Details

### Files Modified
- **Database migration** -- add `banner_url` and `about_me` columns to profiles
- `src/pages/Auth.tsx` -- username field, password strength bar + validation
- `src/contexts/AuthContext.tsx` -- pass username to signup
- `src/pages/Settings.tsx` -- banner upload, about me textarea
- `src/components/chat/UserProfilePanel.tsx` -- show banner image, about me section
- `src/i18n/en.ts` -- new translation keys
- `src/i18n/ar.ts` -- new translation keys

### New Component
- `src/components/PasswordStrengthBar.tsx` -- reusable component showing 4-segment strength bar + rule checklist

### Password Strength Logic
```text
Rules checked:
1. Has uppercase (A-Z)
2. Has lowercase (a-z)
3. Has digit (0-9)
4. Has special char
5. Min 8 chars
6. Not a common password

Strength levels:
- 0-1 rules met: Weak (red)
- 2-3 rules met: Good (orange)
- 4 rules met: Strong (yellow-green)
- 5-6 rules met: Very Strong (green)
```

### Blocked Common Passwords
password, password1, 123456, 12345678, qwerty, abc123, letmein, admin, welcome, monkey, master, dragon, login, princess, football, shadow, sunshine, trustno1

