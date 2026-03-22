

## Investigation Summary

I found **4 distinct issues** causing the server mute/deafen feature to malfunction:

### Issue 1: Muted user's mic still works — LiveKit doesn't enforce server mute

In `VoiceConnectionBar.tsx` (line 167), when `globalMuted` changes, the code calls `room.localParticipant.setMicrophoneEnabled(!globalMuted)`. But when a moderator server-mutes a user, the realtime listener (line 218) sets `globalMuted = true` and disables the mic. However, the speaking detection (line 144) still writes `is_speaking: true` to the database even when the user is server-muted, because LiveKit's `activeSpeakers` fires based on audio input detection regardless of whether the mic track is published.

**Fix:** In the speaking detection effect, suppress `is_speaking` writes when the user is server-muted. Always write `is_speaking: false` if `isServerMuted` is true.

### Issue 2: Speaking indicator shows green mic for server-muted users

In `ChannelSidebar.tsx` (lines 997-1003 and 1030-1036), the icon priority is:
```
deafened → muted → speaking → null
```

This is correct — `server_muted` should take priority over `is_speaking`. However, because of Issue 1, the DB still has `is_speaking: true` written by the muted user's client, and between realtime update cycles there can be a flash of the green mic. The fix for Issue 1 resolves this at the source.

### Issue 3: Muted user doesn't see the effect immediately — realtime filter is too narrow

In `VoiceConnectionBar.tsx` (line 208), the realtime subscription filters by `channel_id=eq.${channelId}` and then further filters by `row.user_id !== user.id` (line 212). This part is correct — it only processes updates for the current user's row.

The actual problem is that the realtime subscription uses `event: "UPDATE"` correctly, but the **initial state is never loaded**. When the component mounts, it doesn't fetch the current `server_muted`/`server_deafened` values from the database. If the moderation happened before the realtime subscription was set up, the user never gets the update.

**Fix:** On mount (when `isJoined` becomes true), fetch the current row and apply any existing server moderation state.

### Issue 4: UserPanel doesn't reflect server moderation visually for the muted user

The UserPanel correctly reads `isServerMuted` and `isServerDeafened` from context and applies the disabled/grayed-out style. This should work once the context values are properly set (fixed by Issues 1 and 3).

---

## Plan

### 1. Fix speaking detection to respect server mute (`VoiceConnectionBar.tsx`)

In the speaking detection effect (~line 141), check `isServerMuted` from the voice channel context. If server-muted, always write `is_speaking: false` to the database regardless of what LiveKit reports.

### 2. Fetch initial moderation state on join (`VoiceConnectionBar.tsx`)

After the DB presence row is inserted on join (~line 431), immediately query the row back to check if `server_muted` or `server_deafened` are already true (e.g., from a previous session or pre-set by a moderator). Apply the enforcement if so.

### 3. Ensure realtime listener properly enforces both transitions (`VoiceConnectionBar.tsx`)

The current listener (line 198-255) handles ON transitions but the OFF transition for mute doesn't restore the mic. Update the `else` branch (line 222) to call `setGlobalMuted(false)` when server unmuted (only if not also server-deafened).

### Files to modify
- `src/components/server/VoiceConnectionBar.tsx` — All 3 fixes above

