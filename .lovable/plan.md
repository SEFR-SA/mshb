

## Plan: Wire Notification Preferences + Native Desktop Notifications

### Audit Findings

1. **`src/lib/notificationPrefs.ts` does NOT exist** — the previous plan was interrupted before this file was created. The `NotificationsTab` writes to `localStorage` under `mshb_notification_prefs`, but nothing reads it.

2. **`GlobalNotificationListener.tsx`** unconditionally calls `playNotificationSound()` and `toast()` — ignores all toggles. Zero `new Notification()` calls exist anywhere.

3. **`useUnreadCount.ts`** also unconditionally calls `playNotificationSound()` + `toast()` on DM unread count increase — ignores prefs, no focus check, no desktop notification.

4. **No `document.hasFocus()` check** anywhere — notifications fire even when the user is actively in the app.

### Changes

**1. New file: `src/lib/notificationPrefs.ts`**
- Export `NotifPrefs` interface and `getNotificationPrefs()` that reads `mshb_notification_prefs` from localStorage with safe defaults
- Single import point for all consumers

**2. Update: `src/components/chat/GlobalNotificationListener.tsx`**
- Import `getNotificationPrefs`
- Inside `shouldNotify` block:
  - **Sound**: check `prefs.mentionSound` (if mention) or `prefs.messageSound` (otherwise) before calling `playNotificationSound()`
  - **Desktop notification**: only fire `new Notification(title, { body, icon, silent: true })` when ALL of: `prefs.desktopEnabled`, `Notification.permission === "granted"`, and `!document.hasFocus()` (app not focused / minimized)
  - **Toast**: keep existing in-app toast for non-active channels (this is the in-app fallback when focused)
- Add a `useEffect` for tab title: when `prefs.showTabCount` is true, update `document.title` with unread count using a lightweight subscription to `useUnreadCount`

**3. Update: `src/hooks/useUnreadCount.ts`**
- Import `getNotificationPrefs`
- Before `playNotificationSound()` + `toast()`: read prefs and check `prefs.messageSound` before playing sound
- Add `!document.hasFocus()` guard — only sound/toast when app is not focused
- Fire `new Notification()` for DM messages when `prefs.desktopEnabled` and `!document.hasFocus()`

**4. Update: `src/components/settings/tabs/NotificationsTab.tsx`**
- Email section: disable both email toggles, add a "Coming Soon" badge/text so users aren't misled
- No other changes needed — the permission request flow is already correct

### Key Logic (GlobalNotificationListener)

```typescript
if (shouldNotify) {
  const prefs = getNotificationPrefs();
  const appFocused = document.hasFocus();

  // Sound — respect toggles
  const shouldPlaySound = isMentioned ? prefs.mentionSound : prefs.messageSound;
  if (shouldPlaySound) {
    playNotificationSound().catch(() => {});
  }

  // Native OS notification — only when unfocused
  if (
    prefs.desktopEnabled &&
    !appFocused &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    new Notification(
      isMentioned ? `Mention in ${serverName}` : `New message in ${serverName}`,
      {
        body: `#${channelData.name}: ${content.substring(0, 80)}`,
        icon: "/icon-192.png",
        silent: true,
      }
    );
  }

  // In-app toast (when focused but not on that channel)
  if (!isActiveChannel) {
    toast({ ... });
  }
}
```

### Files Changed

| File | Change |
|------|--------|
| `src/lib/notificationPrefs.ts` | **New** — shared `getNotificationPrefs()` utility |
| `src/components/chat/GlobalNotificationListener.tsx` | Read prefs, gate sound on toggles, fire `new Notification()` when unfocused + enabled, add tab title unread effect |
| `src/hooks/useUnreadCount.ts` | Read prefs, gate DM sound/toast on toggles + `document.hasFocus()`, fire native notification for DMs |
| `src/components/settings/tabs/NotificationsTab.tsx` | Disable email toggles with "Coming Soon" label |

