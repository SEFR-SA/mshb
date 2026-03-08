

## Architectural Insight

The current approach of sprinkling `isStreamerMode` checks across individual callers is fragile — every new sound source requires remembering to add the gate. The sound manager (`soundManager.ts`) is the **single chokepoint** for all audio in the app. By adding the streamer mode check directly inside `playSound`, `playNotificationSound`, and `startLoop`, we get **total silence** with one edit to one file, and zero risk of future callers bypassing the gate.

Since `soundManager.ts` is a plain module (not a React component), it can't use `useStreamerMode()`. Instead, it will read `localStorage.getItem("mshb_streamer_mode")` directly — the same key the context writes to. This is a synchronous, zero-overhead check.

This also lets us **remove** the scattered `isStreamerMode` checks we previously added in `CallListener.tsx`, `Chat.tsx`, and `usePendingFriendRequests.ts` (for sound only — the toast suppression in `usePendingFriendRequests` and `GlobalNotificationListener` stays).

---

## Plan

### 1. Centralize sound suppression in `soundManager.ts`
**File:** `src/lib/soundManager.ts`

Add a helper:
```ts
function isStreamerMode(): boolean {
  try { return localStorage.getItem("mshb_streamer_mode") === "true"; } catch { return false; }
}
```

Gate the three public sound functions:
- `playSound()` — early return if `isStreamerMode()`
- `playNotificationSound()` — early return if `isStreamerMode()`
- `startLoop()` — early return if `isStreamerMode()`

**Result:** Every sound in the entire app — call_end, mute/unmute, deafen/undeafen, ringtones, notification pings, voice join — is silenced. Total silence.

### 2. Clean up redundant per-component checks (optional but recommended)
Remove the `isStreamerMode` sound gates we added previously in:
- `src/components/chat/CallListener.tsx` (line 167 — the `&& !isStreamerMode` on `startLoop`)
- `src/pages/Chat.tsx` (line 190 — the `if (!isStreamerMode)` on `startLoop`)

These are now redundant since the sound manager itself blocks everything. Removing them keeps the code clean. The `useStreamerMode` imports can also be removed from these files if no other streamer-mode logic remains.

**Note:** Keep the `isStreamerMode` checks in `usePendingFriendRequests.ts`, `GlobalNotificationListener.tsx`, and `useUnreadCount.ts` — those gate **toasts and native OS notifications**, not just sounds.

---

### Files Summary

| Action | File | Change |
|--------|------|--------|
| **Edit** | `src/lib/soundManager.ts` | Add `isStreamerMode()` helper, gate `playSound`, `playNotificationSound`, `startLoop` |
| **Edit** | `src/components/chat/CallListener.tsx` | Remove redundant `!isStreamerMode` from `startLoop` call |
| **Edit** | `src/pages/Chat.tsx` | Remove redundant `!isStreamerMode` from `startLoop` call |

