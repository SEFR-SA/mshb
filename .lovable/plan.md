

## Streamer Mode — Missing Sound/Notification Suppression

The core issue: Streamer Mode currently gates only message notifications (`GlobalNotificationListener` and `useUnreadCount`), but **call ringtones and friend request notifications** bypass it entirely.

### Files to fix:

**1. `src/components/chat/CallListener.tsx` (line 165-166)**
- Incoming ring plays based only on `callPrefs.callSound` — no streamer mode check.
- Import `useStreamerMode`, suppress `startLoop("incoming_ring")` when active.
- The incoming call dialog should still appear (user needs to know), just silently.

**2. `src/pages/Chat.tsx` (line 188)**
- Outgoing ring (`startLoop("outgoing_ring")`) plays unconditionally when initiating a call.
- Gate behind `!isStreamerMode`.

**3. `src/hooks/usePendingFriendRequests.ts` (lines 22-25)**
- Plays notification sound AND shows toast on new friend request — completely unaware of streamer mode.
- Import `useStreamerMode`, skip both `playNotificationSound()` and `toast()` when active.

**4. `src/contexts/AudioSettingsContext.tsx` (lines 131, 140)**
- Global mute/deafen toggle sounds — these are **user-initiated feedback sounds** (not notifications), so they should **stay enabled** in streamer mode. No change needed here.

**5. Call end / mute / deafen sounds in `CallListener.tsx` and `Chat.tsx`**
- Same rationale as #4 — these are direct UI feedback for the user's own actions during an active call. **No change needed.**

### Summary of changes:

| File | Change |
|------|--------|
| `src/components/chat/CallListener.tsx` | Add `useStreamerMode` check around `startLoop("incoming_ring")` |
| `src/pages/Chat.tsx` | Add `useStreamerMode` check around `startLoop("outgoing_ring")` |
| `src/hooks/usePendingFriendRequests.ts` | Add `useStreamerMode` check around sound + toast |

Three small, surgical edits. No new files, no architectural changes.

