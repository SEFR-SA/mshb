

## Investigation Results

After tracing the full drag-and-drop voice user move flow, I identified **two issues**:

### Issue 1: `move_members` permission missing from both database RPCs

The `get_user_permissions` and `get_user_permissions_strict` database functions have a hardcoded `_all_perms` array that does **not** include `move_members`. This means:
- For **owner/admin**: No impact (client uses `ALL_TRUE` which includes `move_members: true`)
- For **non-owner/admin with a role that grants `move_members`**: The permission is never returned by the RPC, so dragging is disabled even though the role grants it

This is a minor gap but should be fixed for consistency.

### Issue 2: After the move RPC succeeds, the target user's client doesn't complete the move

The move flow works like this:
1. Admin drops a user → `move_voice_user` RPC sets `pending_move_channel_id` on the target's `voice_channel_participants` row
2. Target user's `VoiceConnectionBar` has a realtime listener that should detect this update
3. Listener calls `setVoiceChannel()` with the new channel, causing the component to remount (key change)
4. On unmount, old DB row is deleted; on mount, new row is inserted in the new channel

**The problem**: After `setVoiceChannel()` is called (line 259), the component sets the new voice channel but **never clears `pending_move_channel_id`** from the old row. More critically, the old DB row cleanup and LiveKit reconnection must happen in the correct order. The current code calls `setVoiceChannel()` inside a realtime callback, which triggers a React state update → re-render → unmount. But the unmount cleanup effect (line 513) was captured with `[]` dependencies, meaning it uses a **stale** `cleanupDb` reference that may point to the wrong `channelId`.

Additionally, the `VoiceConnectionBar` unmount effect at line 513 calls `lk.disconnect()` and `cleanupDb()` — but the `cleanupDb` inside this closure was created at initial mount time. Since `cleanupDb` depends on `channelId` via `useCallback`, and the effect has `[]` deps, it captures the initial `cleanupDb` which uses the initial `channelId`. This is actually correct because `channelId` doesn't change within a component instance (it remounts with a new key). So this should be fine.

After more analysis, the most likely root cause is that **the Supabase Realtime payload for the `voice_channel_participants` UPDATE may not include the newly-added `pending_move` columns** in the `new` record, OR the update is reaching the client but the `setVoiceChannel` call doesn't properly trigger the full disconnect→reconnect cycle.

### The Fix

Instead of relying solely on the realtime `pending_move` signal, make the move more robust:

1. **In `VoiceConnectionBar.tsx`**: After detecting a pending move, properly disconnect from the current channel (clean up DB row, disconnect LiveKit) BEFORE setting the new voice channel. Also clear the pending_move fields after processing.

2. **In the `move_voice_user` DB function**: Instead of just setting pending fields, also perform the actual row update (change `channel_id` to the new channel). This way the move happens server-side and the client just needs to reconnect.

3. **Add `move_members` to both `get_user_permissions` and `get_user_permissions_strict`** RPCs.

### Files to modify
- `src/components/server/VoiceConnectionBar.tsx` — Fix the move handler to properly disconnect before reconnecting, and clear pending fields
- Database migration — Update `move_voice_user` function to be more robust, and add `move_members` to both permission RPCs

### Technical Detail

```text
Current (broken) flow:
  Admin drops user → RPC sets pending_move on row
  → Realtime fires on target client
  → setVoiceChannel() called (state update)
  → Component remounts with new key
  → Old cleanup runs (disconnect + delete old row)
  → New mount runs (connect + insert new row)
  Problem: Race conditions, stale state, pending fields never cleared

Fixed flow:
  Admin drops user → RPC sets pending_move on row
  → Realtime fires on target client
  → Handler explicitly: disconnects LiveKit, clears old DB row, clears pending fields
  → THEN sets new voice channel
  → Component remounts cleanly with new channel
```

