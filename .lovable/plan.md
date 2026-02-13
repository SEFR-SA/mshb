

# Status System with Dropdown, Duration, and Color Badges

## Overview
Replace the free-text "Status" input field in Settings with a structured status system featuring 5 predefined statuses (Online, Busy, Do Not Disturb, Idle, Invisible), each with a color-coded badge, and optional duration selection for non-Online statuses. When the selected duration expires, the status automatically reverts to "Online."

---

## What Changes

### 1. Database Migration
Add two new columns to the `profiles` table:
- `status` (text, default `'online'`) -- one of: `online`, `busy`, `dnd`, `idle`, `invisible`
- `status_until` (timestamptz, nullable) -- when the status should revert to online; null means "forever"

The existing `status_text` column remains for custom status messages (optional future use).

### 2. Settings Page (Status Field Replacement)
Replace the current free-text `<Input>` for status with:
- A **Select dropdown** listing the 5 statuses, each with a colored dot badge:
  - Online -- green dot
  - Busy -- red dot
  - Do Not Disturb -- red dot (darker/different shade)
  - Idle -- yellow dot
  - Invisible -- gray dot
- When any status other than "Online" is selected, a **second dropdown** appears for duration:
  - 15 minutes, 1 hour, 8 hours, 24 hours, 3 days, Forever
- On save, both `status` and `status_until` (calculated as `now + duration`, or null for "forever") are written to the database.

### 3. Status Badge Component
Create a reusable `StatusBadge` component that renders a small colored dot based on status value. Used in:
- Settings page (dropdown items + avatar area)
- DM Inbox list (next to each user's avatar)
- Chat header (next to the other user's info)

Color mapping:
- `online` = green (`bg-green-500`)
- `busy` = red (`bg-red-500`)
- `dnd` = red-600 (`bg-red-600`)
- `idle` = yellow (`bg-yellow-500`)
- `invisible` = gray (`bg-gray-400`)

### 4. Auto-Revert Logic
- On the client side: when the profile loads, check if `status_until` is in the past. If so, automatically update status to `'online'` and clear `status_until`.
- The presence hook will also consider `status === 'invisible'` to show the user as offline to others.

### 5. Presence Integration
Update the presence display logic:
- If a user's status is `invisible`, show them as offline (gray dot) to other users
- Otherwise, show their selected status badge color instead of the simple green/no-dot presence indicator

### 6. i18n Translations
Add translation keys for all 5 statuses and all 6 duration options in both English and Arabic files.

---

## Technical Details

### Files Modified
- **New migration** -- adds `status` and `status_until` columns to `profiles`
- **`src/pages/Settings.tsx`** -- replace status input with Select dropdowns + duration picker
- **`src/components/StatusBadge.tsx`** (new) -- reusable colored dot component
- **`src/pages/Inbox.tsx`** -- use StatusBadge instead of simple green dot
- **`src/pages/Chat.tsx`** -- use StatusBadge in chat header
- **`src/contexts/AuthContext.tsx`** -- add auto-revert check on profile load
- **`src/hooks/usePresence.ts`** -- factor in `invisible` status
- **`src/i18n/en.ts`** and **`src/i18n/ar.ts`** -- new translation keys for statuses and durations

### Status Values
```text
online | busy | dnd | idle | invisible
```

### Duration Options (stored as minutes for calculation)
```text
15m | 60m | 480m | 1440m | 4320m | forever (null)
```

