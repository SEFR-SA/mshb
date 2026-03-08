
## Fix: Wire Notification Preferences + Add Desktop Notifications

### Problem
1. `NotificationsTab` saves prefs to `localStorage` under `mshb_notification_prefs` — but **no code ever reads them**
2. `GlobalNotificationListener` unconditionally calls `playNotificationSound()` and `toast()` — ignoring all toggle states
3. **No native desktop notification** (`new Notification(...)`) is ever fired — the "Desktop Notifications" toggle does nothing
4. The "Show tab count" toggle does nothing — no code updates `document.title`
5. The "Email" toggles have no backend to send emails — these should be hidden or marked as "coming soon"

### Solution

**1. Create a shared utility to read notification prefs**

New file: `src/lib/notificationPrefs.ts`
- Export a `getNotificationPrefs()` function that reads and parses `mshb_notification_prefs` from localStorage with defaults
- Single source of truth, importable from any component

**2. Update `GlobalNotificationListener` to respect prefs + fire desktop notifications**

File: `src/components/chat/GlobalNotificationListener.tsx`
- Import `getNotificationPrefs`
- Before playing sound, check `prefs.messageSound` (for regular messages) and `prefs.mentionSound` (for mentions)
- When `prefs.desktopEnabled` is true and `Notification.permission === "granted"`, fire a native `new Notification(title, { body, icon })` — this works in both Electron and browsers
- The native notification is the key missing piece for Electron desktop notifications

**3. Add tab title unread count**

File: `src/components/chat/GlobalNotificationListener.tsx` (or a new small hook)
- When `prefs.showTabCount` is true, update `document.title` to include unread count (e.g., `(3) MSHB`)
- Read `totalUnread` from existing `useUnreadCount` hook

**4. Mark email toggles as "Coming Soon"**

File: `src/components/settings/tabs/NotificationsTab.tsx`
- Disable the email toggles and add a "Coming Soon" badge so users aren't confused

**5. Fix the console warning**

File: `src/components/settings/tabs/NotificationsTab.tsx`
- The `ToggleRow` component gets a ref warning because `Switch` tries to forward a ref. Wrap `ToggleRow` in `React.forwardRef` or restructure to fix the warning from the console logs.

### Key code change (GlobalNotificationListener)

```typescript
import { getNotificationPrefs } from "@/lib/notificationPrefs";

// Inside handleNewMessage, after shouldNotify is determined:
if (shouldNotify) {
  const prefs = getNotificationPrefs();

  // Sound — respect toggle
  const shouldPlaySound = isMentioned ? prefs.mentionSound : prefs.messageSound;
  if (shouldPlaySound) {
    playNotificationSound().catch(() => {});
  }

  // Desktop notification — works in Electron + browser
  if (prefs.desktopEnabled && Notification.permission === "granted") {
    new Notification(
      isMentioned ? `Mention in ${serverName}` : `New message in ${serverName}`,
      {
        body: `#${channelData.name}: ${content.substring(0, 80)}`,
        icon: "/icon-192.png",
        silent: true, // we handle sound separately
      }
    );
  }

  // In-app toast (only when not viewing the channel)
  if (!isActiveChannel) {
    toast({ ... });
  }
}
```

### Files Changed

| File | Change |
|------|--------|
| `src/lib/notificationPrefs.ts` | New — shared getter for notification preferences |
| `src/components/chat/GlobalNotificationListener.tsx` | Read prefs, conditionally play sound, fire native `new Notification()` for desktop |
| `src/components/settings/tabs/NotificationsTab.tsx` | Fix forwardRef warning, mark email toggles as "Coming Soon", disable them |

### What this enables
- Toggling "Desktop Notifications" ON will fire real OS-level notifications in Electron (and browsers that support it)
- Sound toggles will actually mute/unmute notification sounds
- Email toggles won't mislead users into thinking they work
