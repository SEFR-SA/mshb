

## Notification Toggles Audit

Here is the status of every toggle on the Notifications settings page:

| # | Toggle | Status | Details |
|---|--------|--------|---------|
| 1 | **Enable Desktop Notifications** | **Working** | `GlobalNotificationListener` and `useUnreadCount` both check `prefs.desktopEnabled` and fire `new Notification()` when unfocused |
| 2 | **Message Sound** | **Working** | Both listeners check `prefs.messageSound` before calling `playNotificationSound()` |
| 3 | **Incoming Call Sound** | **Not wired** | `callSound` pref is saved to localStorage but **never read**. `CallListener.tsx` unconditionally calls `startLoop("incoming_ring")` — ignoring the toggle entirely |
| 4 | **Mention Sound** | **Working** | `GlobalNotificationListener` checks `prefs.mentionSound` for mention-specific sound |
| 5 | **Show Unread Badge** | **Not wired** | `showBadge` pref is saved but **never read** anywhere. Unread badge dots render unconditionally |
| 6 | **Show Count in Tab** | **Working** | `GlobalNotificationListener` reads `prefs.showTabCount` and updates `document.title` |
| 7 | **Email: Missed Messages** | **Not implemented** | Placeholder, correctly marked "Coming Soon" |
| 8 | **Email: Friend Requests** | **Not implemented** | Placeholder, correctly marked "Coming Soon" |

**Summary: 2 toggles are broken** — `callSound` and `showBadge` are saved but never consumed.

---

## Plan: Wire the 2 broken toggles

### 1. Wire `callSound` toggle in `CallListener.tsx`

File: `src/components/chat/CallListener.tsx`

- Import `getNotificationPrefs` from `@/lib/notificationPrefs`
- Before calling `startLoop("incoming_ring")` (~line 163), read prefs and only start the ring loop if `prefs.callSound` is true
- This is a 3-line change: import + wrap the `startLoop` call in an `if`

### 2. Wire `showBadge` toggle for unread badge dots

This requires identifying where unread badge dots are rendered. The `showBadge` toggle description says "Show a red dot or count on app icon." In this web/Electron context, this means the unread count badges shown on the sidebar (server rail, DM list, etc.).

Files to update (wherever unread dot/count badges render):
- Import `getNotificationPrefs` and conditionally hide the badge element when `prefs.showBadge` is false
- The badge DOM still exists but is visually hidden, so counts still track correctly — only the visual indicator is suppressed

I will need to search for the badge rendering locations to identify exact files.

### Files Changed

| File | Change |
|------|--------|
| `src/components/chat/CallListener.tsx` | Gate `startLoop("incoming_ring")` on `prefs.callSound` |
| Badge rendering files (sidebar/rail) | Gate unread badge visibility on `prefs.showBadge` |

