

## Architectural Insight

**Existing patterns:** The app uses React Context for all global state (Auth, Theme, Audio, VoiceChannel). There is no Zustand/Jotai. `localStorage` is already used for notification prefs (`notificationPrefs.ts`). The `useGlobalKeybinds` hook is the canonical place for app-wide keyboard shortcuts. The `AppLayout` already renders global banners (Electron title bar, voice connection bar).

**Potential conflict:** `Ctrl+Shift+S` — no existing keybind uses this combo (Start Streaming is `Ctrl+Alt+S`). Safe to use.

**Key design decision:** Rather than a full Context, Streamer Mode is best implemented as a simple `localStorage`-backed hook (like `notificationPrefs.ts`) since it has no complex state, no children that need to set it, and only needs a boolean read. However, since multiple components need to reactively read it and the keybind can toggle it from anywhere, a lightweight Context is the cleaner choice — it avoids prop-drilling and ensures all consumers re-render on toggle.

---

## Plan: Streamer Mode

### 1. Create `StreamerModeContext` — new file
**File:** `src/contexts/StreamerModeContext.tsx`

- Provides `isStreamerMode` (boolean) and `toggleStreamerMode()`.
- Persists to `localStorage` key `mshb_streamer_mode`.
- Reads initial value from `localStorage` on mount.

### 2. Wire into App provider tree
**File:** `src/App.tsx`

- Wrap inside existing provider stack (after `ThemeProvider`, before `AudioSettingsProvider`).

### 3. Add global keybind `Ctrl+Shift+S`
**File:** `src/hooks/useGlobalKeybinds.ts`

- Import `useStreamerMode` from the new context.
- Add a third condition: `Ctrl+Shift+S` → `toggleStreamerMode()`.
- Show a toast confirming "Streamer Mode enabled/disabled".

### 4. Suppress all notifications when active
**Files:**
- `src/components/chat/GlobalNotificationListener.tsx` — early-return from `handleNewMessage` and skip tab title updates when streamer mode is on.
- `src/hooks/useUnreadCount.ts` — skip sound, toast, and native notification when streamer mode is on.

Both files will import `useStreamerMode` and gate all sound/toast/Notification calls behind `!isStreamerMode`.

### 5. Visual banner in AppLayout
**File:** `src/components/layout/AppLayout.tsx`

- Import `useStreamerMode`.
- Render a slim `bg-indigo-500 text-white` banner at the top (before Electron title bar / main content) when `isStreamerMode` is true.
- Banner text: "Streamer Mode is Enabled" + a "Disable" button that calls `toggleStreamerMode()`.

### 6. Update KeybindsTab
**File:** `src/components/settings/tabs/KeybindsTab.tsx`

- Add a new "App Settings" section to the `SECTIONS` array:
  ```ts
  { title: "App Settings", binds: [{ label: "Toggle Streamer Mode", keys: ["Ctrl", "Shift", "S"] }] }
  ```

### 7. Data masking (AccountTab + ServerInviteCard)
**Files:**
- `src/components/settings/tabs/AccountTab.tsx` — when `isStreamerMode`, display the user's email as `u***@***.com` (first char + asterisks).
- `src/components/chat/ServerInviteCard.tsx` — when `isStreamerMode`, replace the invite code display with `••••••••`.

---

### Files Summary

| Action | File |
|--------|------|
| **Create** | `src/contexts/StreamerModeContext.tsx` |
| **Edit** | `src/App.tsx` |
| **Edit** | `src/hooks/useGlobalKeybinds.ts` |
| **Edit** | `src/components/chat/GlobalNotificationListener.tsx` |
| **Edit** | `src/hooks/useUnreadCount.ts` |
| **Edit** | `src/components/layout/AppLayout.tsx` |
| **Edit** | `src/components/settings/tabs/KeybindsTab.tsx` |
| **Edit** | `src/components/settings/tabs/AccountTab.tsx` |
| **Edit** | `src/components/chat/ServerInviteCard.tsx` |

No database changes required. No new dependencies.

