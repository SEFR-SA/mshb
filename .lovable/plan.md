

# Fix Missing/Broken Requirements

## Overview
Three gaps found: broken "last seen" translation, missing status text input in Settings, and the translation interpolation bug. Items 1 and 2 are quick fixes.

---

## 1. Fix "Last seen" Translation (Bug)

The `presence.lastSeen` keys in both language files lack `{{time}}` interpolation.

**`src/i18n/en.ts`** (line 71):
- Change `"Last seen"` to `"Last seen {{time}} ago"`

**`src/i18n/ar.ts`** (line 71):
- Change `"آخر ظهور"` to `"آخر ظهور منذ {{time}}"`

This makes the time value from `formatDistanceToNow` actually render in the UI.

---

## 2. Restore Status Text Input in Settings

The original spec requires "status text (optional)" as a profile setting. The database column and save logic already exist -- only the input field is missing from the Settings page.

**`src/pages/Settings.tsx`**:
- Add a text `<Input>` field for "Status Text" (using `profile.statusText` translation key) below the status duration dropdown.
- This is the custom free-text status (e.g., "In a meeting"), separate from the structured status dropdown.

---

## 3. No Action Needed

- **Rate limiting / sanitization**: React's default JSX escaping prevents XSS. Messages are already trimmed and capped at 2000 chars. Full rate limiting would require a backend function -- acceptable to skip for MVP.
- All other requirements (auth, profiles, DM, edit/delete rules, PWA, RTL, dark mode, presence, typing indicators, unread badges, lazy loading) are fully implemented.

---

## Technical Details

### Files Modified
- **`src/i18n/en.ts`** -- fix lastSeen interpolation
- **`src/i18n/ar.ts`** -- fix lastSeen interpolation
- **`src/pages/Settings.tsx`** -- add status text input field back

